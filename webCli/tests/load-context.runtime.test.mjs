import test from 'node:test';
import assert from 'node:assert/strict';

import { createWebCliSandbox } from './helpers.mjs';
import { updateSession } from '../src/runtime/update-session.mjs';
import { loadContext } from '../src/runtime/load-context.mjs';
import { configureDataStore } from '../src/runtime/dataStore.mjs';

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

    const result = await loadContext({
        sessionId: 'sess1',
    });

    assert.equal(result.siteInfo.length, 2);
    assert.equal(result.profilesInfo.length, 2);
    assert.equal(result.currentSessionState.isNewSession, false);
    assert.deepEqual(result.currentSessionState.profiles, ['Developer.md']);
    assert.deepEqual(result.currentSessionState.profileDetails, ['Asked about API integrations']);
    assert.match(result.combinedSiteInfo, /WebAssist builds AI-assisted websites/);
    assert.match(result.combinedProfilesInfo, /Profile: Developer/);
    assert.match(result.currentSessionStateText, /Tell me about your API/);

    const missingSessionResult = await loadContext({
        sessionId: 'new-session',
    });
    assert.equal(missingSessionResult.currentSessionState.isNewSession, true);
    assert.match(
        missingSessionResult.currentSessionStateText,
        /No previous session history found/
    );
});
