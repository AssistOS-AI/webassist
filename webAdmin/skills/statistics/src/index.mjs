import fs from 'node:fs/promises';
import path from 'node:path';

import {
    getIntervalStart,
    getLeadTimestamp,
    isTimestampWithinWindow,
    listLeadRecords,
} from '../../../../webassist-shared/dataStore.mjs';

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('statistics expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('statistics input must be an object.');
    }
    return parsed;
}

export async function action({ promptText, dataDir = './data', referenceDate = new Date() }) {
    const { interval } = parseInput(promptText);

    const sessionsDir = path.join(dataDir, 'sessions');
    const leadsDir = path.join(dataDir, 'leads');
    const window = getIntervalStart(interval, referenceDate);

    let totalSessions = 0;
    try {
        const sessionEntries = await fs.readdir(sessionsDir, { withFileTypes: true });
        const sessionFiles = sessionEntries.filter((entry) => entry.isFile() && entry.name.endsWith('.md'));
        const sessionStats = await Promise.all(
            sessionFiles.map(async (entry) => fs.stat(path.join(sessionsDir, entry.name)))
        );

        totalSessions = sessionStats.filter((stats) => isTimestampWithinWindow(stats.mtimeMs, window)).length;
    } catch (error) {
        if (!error || error.code !== 'ENOENT') {
            throw error;
        }
    }

    let totalLeads = 0;
    const leadsByProfile = {};

    for (const leadRecord of await listLeadRecords(leadsDir)) {
        if (!isTimestampWithinWindow(getLeadTimestamp(leadRecord), window)) {
            continue;
        }

        totalLeads += 1;
        if (leadRecord.parsed.profile) {
            leadsByProfile[leadRecord.parsed.profile] = (leadsByProfile[leadRecord.parsed.profile] || 0) + 1;
        }
    }

    return {
        success: true,
        stats: {
            interval,
            windowStart: window.start.toISOString(),
            windowEnd: window.end.toISOString(),
            totalSessions,
            totalLeads,
            leadsByProfile,
        },
    };
}
