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
    await fs.writeFile(
        path.join(profilesDir, 'Developer.md'),
        '## Characteristics\n- API-focused\n\n## Interests\n- Integrations\n\n## Qualifying criteria\n- Has budget\n',
        'utf8'
    );
    await fs.writeFile(
        path.join(profilesDir, 'EnterpriseClient.md'),
        '## Characteristics\n- Enterprise\n\n## Interests\n- Security\n\n## Qualifying criteria\n- Needs procurement\n',
        'utf8'
    );

    const result = await action({
        promptText: JSON.stringify({}),
        dataDir: sandbox.dataDir,
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.profiles, ['Developer', 'EnterpriseClient']);
});

test('list-profiles returns full markdown for a profile', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const profilesDir = path.join(sandbox.dataDir, 'profilesInfo');
    await fs.mkdir(profilesDir, { recursive: true });
    const source = '## Characteristics\n- API-focused\n\n## Interests\n- Integrations\n\n## Qualifying criteria\n- Has budget\n';
    await fs.writeFile(path.join(profilesDir, 'Developer.md'), source, 'utf8');

    const result = await action({
        promptText: JSON.stringify({ profileName: 'Developer' }),
        dataDir: sandbox.dataDir,
    });

    assert.equal(result.success, true);
    assert.equal(result.profileName, 'Developer');
    assert.match(result.content, /## Characteristics/);
    assert.match(result.content, /- API-focused/);
    assert.deepEqual(result.sectionsDisplayed, ['Characteristics', 'Interests', 'Qualifying criteria']);
});

test('list-profiles returns requested sections and falls back on unknown', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const profilesDir = path.join(sandbox.dataDir, 'profilesInfo');
    await fs.mkdir(profilesDir, { recursive: true });
    await fs.writeFile(
        path.join(profilesDir, 'Developer.md'),
        '## Characteristics\n- API-focused\n\n## Interests\n- Integrations\n\n## Qualifying criteria\n- Has budget\n',
        'utf8'
    );

    const filtered = await action({
        promptText: JSON.stringify({ profileName: 'Developer', sections: ['Interests'] }),
        dataDir: sandbox.dataDir,
    });

    assert.equal(filtered.success, true);
    assert.match(filtered.content, /## Interests/);
    assert.match(filtered.content, /- Integrations/);
    assert.deepEqual(filtered.sectionsDisplayed, ['Interests']);

    const fallback = await action({
        promptText: JSON.stringify({ profileName: 'Developer', sections: ['Other'] }),
        dataDir: sandbox.dataDir,
    });

    assert.equal(fallback.success, true);
    assert.match(fallback.content, /## Characteristics/);
    assert.match(fallback.content, /## Interests/);
    assert.match(fallback.content, /## Qualifying criteria/);
    assert.deepEqual(fallback.sectionsDisplayed, ['Characteristics', 'Interests', 'Qualifying criteria']);
});
