import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebCliSandbox } from './helpers.mjs';
import { handler } from '../skills/updateSession.mjs';

test('updateSession writes and appends the structured session file', async (t) => {
    const sandbox = await createWebCliSandbox();
    t.after(async () => sandbox.cleanup());

    const firstResult = await handler({
        sessionId: 'test-session-1',
        userMessage: 'Hello',
        agentResponse: 'Hi there!',
        profiles: ['Developer.md'],
        profileDetails: ['Understands the API basics'],
    }, sandbox.dataDir);

    assert.equal(firstResult.success, true);

    const secondResult = await handler({
        sessionId: 'test-session-1',
        userMessage: 'Need API help\nASAP',
        agentResponse: 'Happy to help.\nCan you share your timeline?',
        profiles: ['Developer.md', 'Developer.md', 'EnterpriseClient.md'],
        profileDetails: ['Understands the API basics', 'Urgent integration timeline'],
    }, sandbox.dataDir);

    assert.equal(secondResult.success, true);

    const content = await fs.readFile(
        path.join(sandbox.dataDir, 'sessions', 'test-session-1.md'),
        'utf8'
    );

    assert.match(content, /### 1\. Profile/);
    assert.match(content, /- Developer\.md/);
    assert.match(content, /- EnterpriseClient\.md/);
    assert.match(content, /- Urgent integration timeline/);
    assert.match(content, /- \*\*User\*\*: Hello/);
    assert.match(content, /- \*\*User\*\*: Need API help/);
    assert.match(content, /  ASAP/);
    assert.match(content, /- \*\*Agent\*\*: Happy to help\./);
    assert.match(content, /  Can you share your timeline\?/);
});
