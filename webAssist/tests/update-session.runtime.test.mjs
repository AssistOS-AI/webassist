import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAssistSandbox } from './helpers.mjs';
import { updateSession } from '../src/runtime/update-session.mjs';
import { configureDataStore } from '../src/runtime/dataStore.mjs';
import { getSessionHistoryFileName, getSessionProfileFileName } from '../src/constants/datastore.mjs';

test('update-session.runtime writes and appends the structured session file', async (t) => {
    const sandbox = await createWebAssistSandbox();
    t.after(async () => sandbox.cleanup());
    configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const firstResult = await updateSession({
        sessionId: 'test-session-1',
        userMessage: 'Hello',
        agentResponse: 'Hi there!',
        profiles: ['Developer.md'],
        profileDetails: ['Understands the API basics'],
        contactInformation: {
            name: 'Alex Builder',
        },
    });

    assert.equal(firstResult.success, true);

    const secondResult = await updateSession({
        sessionId: 'test-session-1',
        userMessage: 'Need API help\nASAP',
        agentResponse: 'Happy to help.\nCan you share your timeline?',
        profiles: ['Developer.md', 'Developer.md', 'EnterpriseClient.md'],
        profileDetails: ['Understands the API basics', 'Urgent integration timeline'],
        contactInformation: {
            email: 'alex@example.com',
        },
    });

    assert.equal(secondResult.success, true);
    assert.equal(secondResult.session.contactInformation.name, 'Alex Builder');
    assert.equal(secondResult.session.contactInformation.email, 'alex@example.com');

    const profileContent = await fs.readFile(
        path.join(sandbox.dataDir, 'sessions', `${getSessionProfileFileName('test-session-1')}.md`),
        'utf8'
    );
    const historyContent = await fs.readFile(
        path.join(sandbox.dataDir, 'sessions', `${getSessionHistoryFileName('test-session-1')}.md`),
        'utf8'
    );

    assert.match(profileContent, /### 1\. Profile/);
    assert.match(profileContent, /- Developer\.md/);
    assert.match(profileContent, /- EnterpriseClient\.md/);
    assert.match(profileContent, /- Urgent integration timeline/);
    assert.match(profileContent, /### 3\. Contact Information/);
    assert.match(profileContent, /- \*\*name\*\*: Alex Builder/);
    assert.match(profileContent, /- \*\*email\*\*: alex@example\.com/);
    assert.match(historyContent, /### 1\. History/);
    assert.match(historyContent, /- \*\*User\*\*: Hello/);
    assert.match(historyContent, /- \*\*User\*\*: Need API help/);
    assert.match(historyContent, /  ASAP/);
    assert.match(historyContent, /- \*\*Agent\*\*: Happy to help\./);
    assert.match(historyContent, /  Can you share your timeline\?/);
});
