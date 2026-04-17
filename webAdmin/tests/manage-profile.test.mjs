import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAdminSandbox } from './helpers.mjs';
import { action } from '../skills/manage-profile/src/index.mjs';
import { configureDataStore } from '../src/runtime/dataStore.mjs';

test('manage-profile creates or updates profiles case-insensitively', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());
    configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const result = await action({
        promptText: JSON.stringify({
            profileName: 'Developer',
            characteristics: ['API-focused', 'Engineering-led'],
            interests: ['Integrations', 'Automation'],
            qualifyingCriteria: ['Owns technical roadmap', 'Has implementation budget'],
        }),
    });

    assert.equal(result.created, true);
    assert.equal(result.updated, false);
    assert.equal(result.profileName, 'Developer.md');

    const profilePath = path.join(sandbox.dataDir, 'profilesInfo', 'Developer.md');
    const content = await fs.readFile(profilePath, 'utf8');
    assert.match(content, /### 1\. Characteristics/);
    assert.match(content, /- API-focused/);
    assert.match(content, /### 2\. Interests/);
    assert.match(content, /- Integrations/);
    assert.match(content, /### 3\. Qualifying criteria/);
    assert.match(content, /- Has implementation budget/);

    const updated = await action({
        promptText: JSON.stringify({
            profileName: 'developer',
            characteristics: ['Revised profile'],
            interests: ['Case-insensitive update'],
            qualifyingCriteria: ['Updated criteria'],
        }),
    });

    assert.equal(updated.created, false);
    assert.equal(updated.updated, true);
    assert.equal(updated.profileName, 'Developer.md');

    const updatedContent = await fs.readFile(profilePath, 'utf8');
    assert.match(updatedContent, /- Revised profile/);
    assert.match(updatedContent, /- Case-insensitive update/);
    assert.match(updatedContent, /- Updated criteria/);
});

test('manage-profile lists profiles and displays one profile with optional sections', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());
    configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const profilesDir = path.join(sandbox.dataDir, 'profilesInfo');
    await fs.mkdir(profilesDir, { recursive: true });
    await fs.writeFile(
        path.join(profilesDir, 'Developer.md'),
        '### 1. Characteristics\n- API-focused\n\n### 2. Interests\n- Integrations\n\n### 3. Qualifying criteria\n- Has budget\n',
        'utf8'
    );
    await fs.writeFile(
        path.join(profilesDir, 'EnterpriseClient.md'),
        '### 1. Characteristics\n- Enterprise\n\n### 2. Interests\n- Security\n\n### 3. Qualifying criteria\n- Needs procurement\n',
        'utf8'
    );

    const listed = await action({
        promptText: JSON.stringify({}),
    });
    assert.deepEqual(listed.profiles, ['Developer', 'EnterpriseClient']);

    const displayed = await action({
        promptText: JSON.stringify({ profileName: 'Developer' }),
    });
    assert.equal(displayed.profileName, 'Developer');
    assert.match(displayed.content, /## Characteristics/);
    assert.match(displayed.content, /- API-focused/);
    assert.deepEqual(displayed.sectionsDisplayed, ['Characteristics', 'Interests', 'Qualifying criteria']);

    const filtered = await action({
        promptText: JSON.stringify({ profileName: 'Developer', sections: ['Interests'] }),
    });
    assert.match(filtered.content, /## Interests/);
    assert.deepEqual(filtered.sectionsDisplayed, ['Interests']);
});
