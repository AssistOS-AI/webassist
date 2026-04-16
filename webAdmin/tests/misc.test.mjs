import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAdminSandbox } from './helpers.mjs';
import { action as leadInfoAction } from '../skills/lead-info/src/index.mjs';
import { action as newsAction } from '../skills/news/src/index.mjs';
import { configureDataStore } from '../src/runtime/dataStore.mjs';

test('lead-info skill returns parsed lead data and related session history', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());
    configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const result = await leadInfoAction({
        promptText: JSON.stringify({ leadId: 'dev-session-lead.md' }),
    });
    assert.equal(result.success, true);
    assert.equal(result.info.leadData.profile, 'Developer');
    assert.equal(result.info.sessionId, 'dev-session');
    assert.equal(result.info.sessionFound, true);
    assert.match(result.info.sessionMarkdown, /Needs API integration support/);
});

test('news skill returns the newest lead summaries first', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());
    configureDataStore({ agentRoot: sandbox.agentRoot, dataDir: sandbox.dataDir });

    const latestLeadPath = path.join(sandbox.dataDir, 'leads', 'newest-session-lead.md');
    await fs.writeFile(latestLeadPath, `### 1. Lead Info
- **Status**: new
- **Profile**: Developer
- **Session ID**: newest-session
- **Created At**: 2026-04-06T11:30:00.000Z
- **Updated At**: 2026-04-06T11:30:00.000Z

### 2. Contact Info
- **email**: newest@example.com
- **name**: Nova Newest

### 3. Summary
Newest lead for admin news coverage.
`);

    const result = await newsAction({
        promptText: JSON.stringify({ limit: 2 }),
    });
    assert.equal(result.success, true);
    assert.equal(result.leads.length, 2);
    assert.equal(result.leads[0].leadId, 'newest-session-lead.md');
    assert.equal(result.leads[0].status, 'new');
    assert.match(result.leads[0].summary, /Newest lead/);
});
