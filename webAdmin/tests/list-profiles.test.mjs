import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAdminSandbox } from './helpers.mjs';
import { action } from '../skills/list-profiles/src/index.mjs';

test('list-profiles returns profile names without extensions', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const profilesDir = path.join(sandbox.dataDir, 'profilesInfo');
    await fs.mkdir(profilesDir, { recursive: true });
    await fs.writeFile(path.join(profilesDir, 'Developer.md'), 'Profile: Developer\n', 'utf8');
    await fs.writeFile(path.join(profilesDir, 'EnterpriseClient.md'), 'Profile: Enterprise\n', 'utf8');

    const result = await action({
        promptText: JSON.stringify({}),
        dataDir: sandbox.dataDir,
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.profiles, ['Developer', 'EnterpriseClient']);
});
