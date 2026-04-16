import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebCliSandbox } from './helpers.mjs';
import { action } from '../skills/create-lead/src/index.mjs';
import { configureDataStore } from '../src/runtime/dataStore.mjs';

test('create-lead writes a deterministic lead file and updates it in place', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());
    configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const firstResult = await action({
        promptText: JSON.stringify({
            sessionId: 'session-xyz',
            contactInfo: { email: 'test@example.com', name: 'John Doe' },
            profile: 'Developer',
            summary: 'Wants to integrate an API.',
        }),
    });

    assert.equal(firstResult.success, true);
    assert.equal(firstResult.created, true);
    assert.equal(firstResult.leadId, 'session-xyz-lead.md');

    const secondResult = await action({
        promptText: JSON.stringify({
            sessionId: 'session-xyz',
            contactInfo: { email: 'test@example.com', name: 'John Doe' },
            profile: 'Developer',
            summary: 'Ready to scope an implementation call.',
        }),
    });

    assert.equal(secondResult.success, true);
    assert.equal(secondResult.created, false);

    const leadsDir = path.join(sandbox.dataDir, 'leads');
    const files = await fs.readdir(leadsDir);
    assert.deepEqual(files, ['session-xyz-lead.md']);

    const content = await fs.readFile(path.join(leadsDir, files[0]), 'utf8');
    assert.match(content, /- \*\*Status\*\*: new/);
    assert.match(content, /- \*\*Profile\*\*: Developer/);
    assert.match(content, /- \*\*Session ID\*\*: session-xyz/);
    assert.match(content, /- \*\*email\*\*: test@example\.com/);
    assert.match(content, /- \*\*name\*\*: John Doe/);
    assert.match(content, /Ready to scope an implementation call\./);
});
