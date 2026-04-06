import test from 'node:test';
import assert from 'node:assert/strict';

import { createWebCliSandbox } from './helpers.mjs';
import { handler as updateSessionHandler } from '../skills/updateSession.mjs';
import { handler } from '../skills/respondRequest.mjs';

test('respondRequest loads info, profile definitions, and parsed session state', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());

    await updateSessionHandler({
        sessionId: 'sess1',
        userMessage: 'Tell me about your API.',
        agentResponse: 'We provide API integrations for product teams.',
        profiles: ['Developer.md'],
        profileDetails: ['Asked about API integrations'],
    }, sandbox.dataDir);

    const result = await handler({ sessionId: 'sess1' }, sandbox.dataDir);
    assert.equal(result.success, true);
    assert.equal(result.context.siteInfo.length, 2);
    assert.equal(result.context.profilesInfo.length, 2);
    assert.equal(result.context.currentSessionState.isNewSession, false);
    assert.deepEqual(result.context.currentSessionState.profiles, ['Developer.md']);
    assert.deepEqual(result.context.currentSessionState.profileDetails, ['Asked about API integrations']);
    assert.match(result.context.combinedSiteInfo, /WebAssist builds AI-assisted websites/);
    assert.match(result.context.combinedProfilesInfo, /Profile: Developer/);
    assert.match(result.context.currentSessionStateText, /Tell me about your API/);

    const missingSessionResult = await handler({ sessionId: 'new-session' }, sandbox.dataDir);
    assert.equal(missingSessionResult.success, true);
    assert.equal(missingSessionResult.context.currentSessionState.isNewSession, true);
    assert.match(
        missingSessionResult.context.currentSessionStateText,
        /No previous session history found/
    );
});
