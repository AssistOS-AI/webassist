import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createWebAdminSandbox } from './helpers.mjs';
import { handler } from '../skills/statistics.mjs';

test('statistics filters sessions and leads by the requested interval', async (t) => {
    const sandbox = await createWebAdminSandbox();
    t.after(async () => sandbox.cleanup());

    const referenceDate = new Date('2026-04-06T12:00:00.000Z');
    await fs.utimes(
        path.join(sandbox.dataDir, 'sessions', 'dev-session.md'),
        referenceDate,
        referenceDate
    );
    const oldSessionDate = new Date('2025-10-01T12:00:00.000Z');
    await fs.utimes(
        path.join(sandbox.dataDir, 'sessions', 'legacy-session.md'),
        oldSessionDate,
        oldSessionDate
    );

    const result = await handler({ interval: 'month' }, sandbox.dataDir, referenceDate);
    assert.equal(result.success, true);
    assert.equal(result.stats.totalSessions, 1);
    assert.equal(result.stats.totalLeads, 1);
    assert.equal(result.stats.leadsByProfile.Developer, 1);
    assert.equal(result.stats.leadsByProfile.EnterpriseClient, undefined);
});
