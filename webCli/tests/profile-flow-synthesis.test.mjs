import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { LLMAgent } from 'achillesAgentLib';

import { createWebCliAgent } from '../src/index.mjs';
import { getSessionHistoryFileName, getSessionProfileFileName } from '../src/constants/datastore.mjs';
import { createWebCliSandbox } from './helpers.mjs';

class FakeFlowSynthesisLLM extends LLMAgent {
    constructor() {
        super({
            name: 'FakeFlowSynthesisLLM',
            invokerStrategy: async () => '',
        });
    }

    async complete({ context }) {
        if (context?.intent !== 'agentic-session-planner') {
            throw new Error(`Unexpected complete intent: ${context?.intent}`);
        }

        const userPrompt = String(context?.userPrompt ?? '');
        const sessionId = userPrompt.match(/Session ID:\s*([^\n]+)/)?.[1]?.trim() || 'session-flow';
        const isSecondTurn = userPrompt.includes('I can share some papers later');

        if (isSecondTurn) {
            return {
                tool: 'final_answer',
                toolPrompt: JSON.stringify({
                    response: 'Thanks. I still need one detail: what project timeline and expected outcomes do you have?',
                    profiles: ['Researcher.md'],
                    profileDetails: [
                        'Interested in research collaboration',
                        'Open to academic-industry partnerships',
                        'The user did not answer the question about available datasets and student resources.',
                        'The user is asked about project timeline and expected outcomes. His/her next reply should answer the question.',
                    ],
                    contactInformation: {
                        name: 'Research Visitor',
                        email: 'research.visitor@example.com',
                    },
                }),
                reason: 'Return second turn payload.',
            };
        }

        return {
            tool: 'final_answer',
            toolPrompt: JSON.stringify({
                response: 'Great. What available datasets and student resources can you provide for collaboration?',
                profiles: ['Researcher.md'],
                profileDetails: [
                    'Interested in research collaboration',
                    'The user is asked about available datasets and student resources. His/her next reply should answer the question.',
                ],
                contactInformation: {
                    name: 'Research Visitor',
                },
            }),
            reason: 'Return first turn payload.',
        };
    }
}

test('webCli persists orchestrator-authored conversation memory inside profile details and keeps history on disk', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());

    const agent = await createWebCliAgent({
        agentRoot: sandbox.agentRoot,
        dataDir: sandbox.dataDir,
        llmAgent: new FakeFlowSynthesisLLM(),
    });

    const firstTurn = await agent.handleMessage({
        sessionId: 'session-flow-1',
        message: 'Can we collaborate on AI research?',
    });

    assert.deepEqual(firstTurn.profiles, ['Researcher.md']);
    assert.equal(firstTurn.contactInformation.name, 'Research Visitor');
    assert.ok(firstTurn.profileDetails.includes('The user is asked about available datasets and student resources. His/her next reply should answer the question.'));

    const secondTurn = await agent.handleMessage({
        sessionId: 'session-flow-1',
        message: 'I can share some papers later.',
    });

    assert.ok(secondTurn.profileDetails.includes('The user did not answer the question about available datasets and student resources.'));
    assert.ok(secondTurn.profileDetails.includes('The user is asked about project timeline and expected outcomes. His/her next reply should answer the question.'));
    assert.equal(secondTurn.contactInformation.email, 'research.visitor@example.com');

    const profilePath = path.join(sandbox.dataDir, 'sessions', `${getSessionProfileFileName('session-flow-1')}.md`);
    const historyPath = path.join(sandbox.dataDir, 'sessions', `${getSessionHistoryFileName('session-flow-1')}.md`);
    const profileContent = await fs.readFile(profilePath, 'utf8');
    const historyContent = await fs.readFile(historyPath, 'utf8');

    assert.match(profileContent, /The user did not answer the question about available datasets and student resources\./);
    assert.match(profileContent, /The user is asked about project timeline and expected outcomes\./);
    assert.match(profileContent, /- \*\*name\*\*: Research Visitor/);
    assert.match(profileContent, /- \*\*email\*\*: research\.visitor@example\.com/);
    assert.match(historyContent, /Can we collaborate on AI research\?/);
    assert.match(historyContent, /I can share some papers later\./);
});
