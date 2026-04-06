import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAdminSandbox } from './helpers.mjs';
import { handler } from '../skills/updateLead.mjs';

test('updateLead updates lead lifecycle state and rejects invalid cases', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const result = await handler({
        leadId: 'dev-session-lead.md',
        newStatus: 'contacted',
    }, sandbox.dataDir);

    assert.equal(result.success, true);
    assert.equal(result.lead.status, 'contacted');

    const content = await fs.readFile(
        path.join(sandbox.dataDir, 'leads', 'dev-session-lead.md'),
        'utf8'
    );
    assert.match(content, /- \*\*Status\*\*: contacted/);
    assert.match(content, /- \*\*Created At\*\*: 2026-04-05T09:00:00.000Z/);

    const invalidStatus = await handler({
        leadId: 'dev-session-lead.md',
        newStatus: 'new',
    }, sandbox.dataDir);
    assert.equal(invalidStatus.success, false);
    assert.match(invalidStatus.error, /Invalid status/);

    const missingLead = await handler({
        leadId: 'missing.md',
        newStatus: 'invalid',
    }, sandbox.dataDir);
    assert.equal(missingLead.success, false);
    assert.match(missingLead.error, /Lead not found/);
});
