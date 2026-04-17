import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { LLMAgent } from 'achillesAgentLib';

import { createWebCliAgent } from '../src/index.mjs';
import { getSessionHistoryFileName, getSessionProfileFileName } from '../src/constants/datastore.mjs';
import { createWebCliSandbox } from './helpers.mjs';

class FakeWebCliLLM extends LLMAgent {
    constructor() {
        super({
            name: 'FakeWebCliLLM',
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
                success: true,
                sessionId,
                response: 'Sigur — va putem ajuta cu integrarea API-ului. Mai jos gasiti linkul de programare.',
                userMessageEnglish: 'Hello, I want to integrate your API. I am Alice, alice@example.com. Can we schedule a discussion?',
                agentResponseEnglish: 'Sure — we can help with API integration. Below you can find the scheduling link.',
                profiles: ['Developer.md'],
                profileDetails: ['Evaluating an API integration', 'Provided email address'],
                flow: {
                    answeredPendingQuestion: true,
                    pendingQuestionTopic: 'implementation timeline and integration constraints',
                },
                lead: {
                    shouldCreate: true,
                    success: true,
                    created: true,
                    leadId: `${sessionId}-lead.md`,
                },
                meeting: {
                    shouldOffer: true,
                    configData: 'Calendar link: https://cal.example.com/webassist-demo',
                },
            }),
            reason: 'Return final runtime payload.',
        };
    }
}

test('webCli agent loads AchillesAgentLib and executes a full visitor turn', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());
    const sandboxDataStoreModule = await import(pathToFileURL(path.join(sandbox.agentRoot, 'src', 'runtime', 'dataStore.mjs')).href);
    sandboxDataStoreModule.configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const llmAgent = new FakeWebCliLLM();
    const agent = await createWebCliAgent({
        agentRoot: sandbox.agentRoot,
        dataDir: sandbox.dataDir,
        llmAgent,
    });

    const result = await agent.handleMessage({
        sessionId: 'visitor-42',
        message: 'Buna, vreau sa integrez API-ul vostru. Sunt Alice, alice@example.com. Putem programa o discutie?',
    });

    assert.equal(agent.achilles.libraryName, 'achillesAgentLib');
    assert.equal(result.success, true);
    assert.match(result.response, /integrarea API-ului/);
    assert.deepEqual(result.profiles, ['Developer.md']);
    assert.equal(result.lead.shouldCreate, true);
    assert.equal(result.lead.leadId, 'visitor-42-lead.md');
    assert.equal(result.meeting.shouldOffer, true);
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
    assert.match(sessionProfileContent, /The user is asked about implementation timeline and integration constraints\./);
    assert.match(sessionHistoryContent, /Hello, I want to integrate your API/);
    assert.match(sessionHistoryContent, /Below you can find the scheduling link/);
});
