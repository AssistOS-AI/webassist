import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebCliSandbox } from './helpers.mjs';
import { handler } from '../skills/bookMeeting.mjs';

test('bookMeeting returns the owner configuration and errors on missing config', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());

    const successResult = await handler({ sessionId: 'session1' }, sandbox.dataDir);
    assert.equal(successResult.success, true);
    assert.match(successResult.configData, /Calendar link: https:\/\/cal\.example\.com\/webassist-demo/);

    const configDir = path.join(sandbox.dataDir, 'config');
    await fs.rm(configDir, { recursive: true, force: true });
    await fs.mkdir(configDir, { recursive: true });

    const emptyResult = await handler({ sessionId: 'session1' }, sandbox.dataDir);
    assert.equal(emptyResult.success, false);
    assert.match(emptyResult.error, /No configuration found/);
});
