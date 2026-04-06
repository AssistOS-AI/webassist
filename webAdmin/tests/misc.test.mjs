import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAdminSandbox } from './helpers.mjs';
import { handler as leadInfoHandler } from '../skills/leadInfo.mjs';
import { handler as newsHandler } from '../skills/news.mjs';

test('leadInfo skill returns parsed lead data and related session history', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const result = await leadInfoHandler({ leadId: 'dev-session-lead.md' }, sandbox.dataDir);
    assert.equal(result.success, true);
    assert.equal(result.info.leadData.profile, 'Developer');
    assert.equal(result.info.sessionId, 'dev-session');
    assert.equal(result.info.sessionFound, true);
    assert.match(result.info.sessionMarkdown, /Needs API integration support/);
});

test('news skill returns the newest lead summaries first', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const latestLeadPath = path.join(sandbox.dataDir, 'leads', 'newest-session-lead.md');
    await fs.writeFile(latestLeadPath, `### Lead Info
- **Status**: new
- **Profile**: Developer
- **Session ID**: newest-session
- **Created At**: 2026-04-06T11:30:00.000Z
- **Updated At**: 2026-04-06T11:30:00.000Z

### Contact Info
- **email**: newest@example.com
- **name**: Nova Newest

### Summary
Newest lead for admin news coverage.
`);

    const result = await newsHandler({ limit: 2 }, sandbox.dataDir);
    assert.equal(result.success, true);
    assert.equal(result.leads.length, 2);
    assert.equal(result.leads[0].leadId, 'newest-session-lead.md');
    assert.equal(result.leads[0].status, 'new');
    assert.match(result.leads[0].summary, /Newest lead/);
});
