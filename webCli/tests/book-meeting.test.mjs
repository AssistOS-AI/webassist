import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebCliSandbox } from './helpers.mjs';
import { action } from '../skills/book-meeting/src/index.mjs';
import { configureDataStore } from '../src/runtime/dataStore.mjs';

test('book-meeting returns the owner configuration and errors on missing config', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());
    configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const successResult = await action({
        promptText: JSON.stringify({ sessionId: 'session1' }),
    });
    assert.match(successResult, /Calendar link: https:\/\/cal\.example\.com\/webassist-demo/);

    const configDir = path.join(sandbox.dataDir, 'config');
    await fs.rm(configDir, { recursive: true, force: true });
    await fs.mkdir(configDir, { recursive: true });

    await assert.rejects(
        () => action({
            promptText: JSON.stringify({ sessionId: 'session1' }),
        }),
        /No configuration found/
    );
});
