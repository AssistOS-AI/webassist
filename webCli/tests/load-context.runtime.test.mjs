import test from 'node:test';
import assert from 'node:assert/strict';

import { createWebCliSandbox } from './helpers.mjs';
import { updateSession } from '../src/runtime/update-session.mjs';
import { loadContext } from '../src/runtime/load-context.mjs';
import { configureDataStore } from '../src/runtime/dataStore.mjs';
import { action as createLeadAction } from '../skills/create-lead/src/index.mjs';

test('load-context.runtime loads info, profile definitions, and parsed session state', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());
    configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    await updateSession({
        sessionId: 'sess1',
        userMessage: 'Tell me about your API.',
        agentResponse: 'We provide API integrations for product teams.',
        profiles: ['Developer.md'],
        profileDetails: ['Asked about API integrations'],
    });
    await createLeadAction({
        promptText: JSON.stringify({
            sessionId: 'sess1',
            contactInfo: { email: 'sess1@example.com', name: 'Session One' },
            profile: 'Developer',
            summary: 'Qualified developer profile.',
        }),
    });

    const result = await loadContext({
        sessionId: 'sess1',
    });

    assert.equal(result.siteInfo.length, 2);
    assert.equal(result.profilesInfo.length, 2);
    assert.equal(result.currentSessionState.isNewSession, false);
    assert.deepEqual(result.currentSessionState.profiles, ['Developer.md']);
    assert.deepEqual(result.currentSessionState.profileDetails, ['Asked about API integrations']);
    assert.deepEqual(result.currentSessionState.history, []);
    assert.equal(result.currentLeadState.exists, true);
    assert.equal(result.currentLeadState.leadId, 'sess1-lead.md');
    assert.equal(result.currentLeadState.profile, 'Developer');
    assert.equal(result.currentLeadState.sessionId, 'sess1');
    assert.equal(result.currentLeadState.contactInfo.email, 'sess1@example.com');
    assert.match(result.combinedSiteInfo, /WebAssist builds AI-assisted websites/);
    assert.match(result.combinedProfilesInfo, /Profile: Developer/);
    assert.doesNotMatch(result.currentSessionStateText, /Tell me about your API/);
    assert.match(result.currentSessionStateText, /Session Profile/);

    const missingSessionResult = await loadContext({
        sessionId: 'new-session',
    });
    assert.equal(missingSessionResult.currentSessionState.isNewSession, true);
    assert.equal(missingSessionResult.currentLeadState.exists, false);
    assert.match(
        missingSessionResult.currentSessionStateText,
        /No previous session profile found/
    );
});
