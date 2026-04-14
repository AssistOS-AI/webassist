import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAdminAgent, promptKinds } from '../src/WebAdminAgent.mjs';
import { createWebAdminSandbox } from './helpers.mjs';

function createFakeWebAdminLLM(promptKinds) {
    return {
        calls: [],
        async executePrompt(promptText) {
            this.calls.push(promptText);

            if (promptText.includes(promptKinds.classify)) {
                if (promptText.includes('Te rog marcheaza dev-session-lead.md ca converted.')) {
                    return {
                        action: 'updateLead',
                        arguments: {
                            leadId: 'dev-session-lead.md',
                            newStatus: 'converted',
                        },
                    };
                }

                return {
                    action: 'statistics',
                    arguments: {
                        interval: 'month',
                    },
                };
            }

            if (promptText.includes(promptKinds.finalResponse)) {
                if (promptText.includes('Executed action:\nupdateLead')) {
                    return 'Am actualizat leadul dev-session-lead.md la statusul converted.';
                }
                return 'Statisticile pe luna curenta sunt pregatite.';
            }

            throw new Error(`Unexpected prompt: ${promptText}`);
        },
    };
}

test('webAdmin agent loads achillesAgentLib and executes owner requests', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const llmAgent = createFakeWebAdminLLM(promptKinds);
    const agent = await createWebAdminAgent({
        agentRoot: sandbox.agentRoot,
        dataDir: sandbox.dataDir,
        llmAgent,
    });

    const updateResult = await agent.handleMessage({
        message: 'Te rog marcheaza dev-session-lead.md ca converted.',
    });

    assert.equal(agent.achilles.libraryName, 'achillesAgentLib');
    assert.equal(updateResult.action, 'updateLead');
    assert.equal(updateResult.result.lead.status, 'converted');
    assert.match(updateResult.response, /statusul converted/);

    const updatedLeadContent = await fs.readFile(
        path.join(sandbox.dataDir, 'leads', 'dev-session-lead.md'),
        'utf8'
    );
    assert.match(updatedLeadContent, /- \*\*Status\*\*: converted/);

    const statsResult = await agent.handleMessage({
        message: 'Da-mi statisticile pe luna aceasta.',
        referenceDate: new Date('2026-04-06T12:00:00.000Z'),
    });

    assert.equal(statsResult.action, 'statistics');
    assert.equal(statsResult.result.stats.interval, 'month');
    assert.match(statsResult.response, /Statisticile pe luna curenta/);
    assert.equal(llmAgent.calls.length, 4);
});
