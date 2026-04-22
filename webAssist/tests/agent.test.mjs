import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { LLMAgent } from 'achillesAgentLib';

import { createWebAssistAgent } from '../src/index.mjs';
import { getSessionHistoryFileName, getSessionProfileFileName } from '../src/constants/datastore.mjs';
import { createWebAssistSandbox } from './helpers.mjs';

class FakeWebAssistLLM extends LLMAgent {
    constructor() {
        super({
            name: 'FakeWebAssistLLM',
            invokerStrategy: async () => '',
        });
        this.calls = [];
    }

    async complete({ prompt, context }) {
        this.calls.push({ type: 'complete', prompt, context });

        if (context?.intent !== 'agentic-session-planner') {
            throw new Error(`Unexpected complete intent: ${context?.intent}`);
        }

        const sessionId = context?.userPrompt?.match(/"sessionId"\s*:\s*"([^"]+)"/)?.[1] || 'visitor-42';

        if (!prompt.includes('TOOL[create-lead]')) {
            return {
                tool: 'create-lead',
                toolPrompt: JSON.stringify({
                    sessionId,
                    contactInfo: {
                        email: 'alice@example.com',
                        name: 'Alice Example',
                    },
                    profile: 'Developer',
                    summary: 'High-intent developer asking for an API integration discussion.',
                }),
                reason: 'Create qualified lead.',
            };
        }

        if (!prompt.includes('TOOL[book-meeting]')) {
            return {
                tool: 'book-meeting',
                toolPrompt: JSON.stringify({ sessionId }),
                reason: 'Retrieve meeting details.',
            };
        }

        return {
            tool: 'final_answer',
            toolPrompt: JSON.stringify({
                response: 'Sigur — va putem ajuta cu integrarea API-ului. Mai jos gasiti linkul de programare.',
                profiles: ['Developer.md'],
                profileDetails: ['Evaluating an API integration', 'Provided email address'],
                contactInformation: {
                    name: 'Alice Example',
                    email: 'alice@example.com',
                },
            }),
            reason: 'Return final runtime payload.',
        };
    }
}

test('webAssist agent loads AchillesAgentLib and executes a full visitor turn', async (t) => {
    const sandbox = await createWebAssistSandbox();
    t.after(async () => sandbox.cleanup());
    const sandboxDataStoreModule = await import(pathToFileURL(path.join(sandbox.agentRoot, 'src', 'runtime', 'dataStore.mjs')).href);
    sandboxDataStoreModule.configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const llmAgent = new FakeWebAssistLLM();
    const agent = await createWebAssistAgent({
        agentRoot: sandbox.agentRoot,
        dataDir: sandbox.dataDir,
        llmAgent,
    });

    const result = await agent.handleMessage({
        sessionId: 'visitor-42',
        message: 'Buna, vreau sa integrez API-ul vostru. Sunt Alice, alice@example.com. Putem programa o discutie?',
    });

    assert.equal(agent.achilles.libraryName, 'achillesAgentLib');
    assert.match(result.response, /integrarea API-ului/);
    assert.deepEqual(result.profiles, ['Developer.md']);
    assert.equal(result.contactInformation.name, 'Alice Example');
    assert.equal(result.contactInformation.email, 'alice@example.com');
    assert.ok(llmAgent.calls.length >= 3);

    const leadContent = await fs.readFile(
        path.join(sandbox.dataDir, 'leads', 'visitor-42-lead.md'),
        'utf8'
    );
    assert.match(leadContent, /- \*\*Profile\*\*: Developer/);
    assert.match(leadContent, /alice@example\.com/);

    const sessionProfileContent = await fs.readFile(
        path.join(sandbox.dataDir, 'sessions', `${getSessionProfileFileName('visitor-42')}.md`),
        'utf8'
    );
    const sessionHistoryContent = await fs.readFile(
        path.join(sandbox.dataDir, 'sessions', `${getSessionHistoryFileName('visitor-42')}.md`),
        'utf8'
    );
    assert.match(sessionProfileContent, /- Developer\.md/);
    assert.match(sessionProfileContent, /Evaluating an API integration/);
    assert.match(sessionProfileContent, /Provided email address/);
    assert.match(sessionProfileContent, /### 3\. Contact Information/);
    assert.match(sessionProfileContent, /- \*\*name\*\*: Alice Example/);
    assert.match(sessionProfileContent, /- \*\*email\*\*: alice@example\.com/);
    assert.match(sessionHistoryContent, /Hello, I want to integrate your API/);
    assert.match(sessionHistoryContent, /Below you can find the scheduling link/);
});
