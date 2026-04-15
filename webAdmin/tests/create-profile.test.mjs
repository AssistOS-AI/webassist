import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAdminSandbox } from './helpers.mjs';
import { action } from '../skills/create-profile/src/index.mjs';

test('create-profile writes a profilesInfo entry and rejects duplicates', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const result = await action({
        promptText: JSON.stringify({
            profileName: 'Developer',
            characteristics: ['API-focused', 'Engineering-led'],
            interests: ['Integrations', 'Automation'],
            qualifyingCriteria: ['Owns technical roadmap', 'Has implementation budget'],
        }),
        dataDir: sandbox.dataDir,
    });

    assert.equal(result.success, true);
    assert.equal(result.created, true);
    assert.equal(result.profileName, 'Developer.md');

    const profilePath = path.join(sandbox.dataDir, 'profilesInfo', 'Developer.md');
    const content = await fs.readFile(profilePath, 'utf8');
    assert.match(content, /## Characteristics/);
    assert.match(content, /- API-focused/);
    assert.match(content, /## Interests/);
    assert.match(content, /- Integrations/);
    assert.match(content, /## Qualifying criteria/);
    assert.match(content, /- Has implementation budget/);

    const duplicate = await action({
        promptText: JSON.stringify({
            profileName: 'Developer',
            characteristics: ['New entry'],
            interests: ['Other'],
            qualifyingCriteria: ['Other'],
        }),
        dataDir: sandbox.dataDir,
    });

    assert.equal(duplicate.success, false);
    assert.match(duplicate.error, /already exists/);
});
