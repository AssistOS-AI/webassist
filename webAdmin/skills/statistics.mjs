import fs from 'node:fs/promises';
import path from 'node:path';

import {
    getIntervalStart,
    getLeadTimestamp,
    isTimestampWithinWindow,
    listLeadRecords,
} from '../../shared/dataStore.mjs';

export const definition = {
    name: "statistics",
    description: "Returns numerical summaries of total sessions, total leads, and leads by category over a specified time interval.",
    input_schema: {
        type: "object",
        properties: {
            interval: { type: "string", enum: ["day", "week", "month", "year"], description: "The time interval to report." }
        },
        required: ["interval"]
    }
};

export async function handler({ interval }, dataDir = './data', referenceDate = new Date()) {
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
