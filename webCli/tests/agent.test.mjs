import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebCliAgent, promptKinds } from '../src/WebCliAgent.mjs';
import { createWebCliSandbox } from './helpers.mjs';

function createFakeWebCliLLM() {
    return {
        calls: [],
        async executePrompt(promptText) {
            this.calls.push(promptText);

            if (promptText.includes(promptKinds.decision)) {
                return {
                    response: 'Va pot ajuta cu integrarea API-ului si putem merge spre o discutie tehnica.',
                    profiles: ['Developer.md'],
                    profileDetails: ['Evaluating an API integration', 'Provided email address'],
                    lead: {
                        shouldCreate: true,
                        profile: 'Developer',
                        summary: 'High-intent developer asking for an API integration discussion.',
                        contactInfo: {
                            email: 'alice@example.com',
                            name: 'Alice Example',
                        },
                    },
                    meeting: {
                        shouldOffer: true,
                    },
                };
            }

            if (promptText.includes(promptKinds.finalResponse)) {
                assert.match(promptText, /Calendar link: https:\/\/cal\.example\.com\/webassist-demo/);
                return 'Sigur — va putem ajuta cu integrarea API-ului. Mai jos gasiti linkul de programare.';
            }

            if (promptText.includes(promptKinds.historyTranslation)) {
                return {
                    userMessageEnglish: 'Hello, I want to integrate your API. I am Alice, alice@example.com. Can we schedule a discussion?',
                    agentResponseEnglish: 'Sure — we can help with API integration. Below you can find the scheduling link.',
                };
            }

            throw new Error(`Unexpected prompt: ${promptText}`);
        },
    };
}

test('webCli agent loads AchillesAgentLib and executes a full visitor turn', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());

    const llmAgent = createFakeWebCliLLM();
    const agent = await createWebCliAgent({
        agentRoot: sandbox.agentRoot,
        dataDir: sandbox.dataDir,
        llmAgent,
    });

    const result = await agent.handleMessage({
        sessionId: 'visitor-42',
        message: 'Buna, vreau sa integrez API-ul vostru. Sunt Alice, alice@example.com. Putem programa o discutie?',
    });

    assert.equal(agent.achilles.libraryName, 'AchillesAgentLib');
    assert.equal(result.success, true);
    assert.match(result.response, /integrarea API-ului/);
    assert.deepEqual(result.profiles, ['Developer.md']);
    assert.equal(result.lead.shouldCreate, true);
    assert.equal(result.lead.leadId, 'visitor-42-lead.md');
    assert.equal(result.meeting.shouldOffer, true);
    assert.equal(llmAgent.calls.length, 3);

    const leadContent = await fs.readFile(
        path.join(sandbox.dataDir, 'leads', 'visitor-42-lead.md'),
        'utf8'
    );
    assert.match(leadContent, /- \*\*Profile\*\*: Developer/);
    assert.match(leadContent, /alice@example\.com/);

    const sessionContent = await fs.readFile(
        path.join(sandbox.dataDir, 'sessions', 'visitor-42.md'),
        'utf8'
    );
    assert.match(sessionContent, /- Developer\.md/);
    assert.match(sessionContent, /Hello, I want to integrate your API/);
    assert.match(sessionContent, /Below you can find the scheduling link/);
});
