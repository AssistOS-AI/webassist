import path from 'node:path';

import {
    getLeadTimestamp,
    listLeadRecords,
    toIsoTimestamp,
} from '../../../../shared/dataStore.mjs';

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('news expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('news input must be an object.');
    }
    return parsed;
}

export async function action({ promptText, dataDir = './data' }) {
    const { limit = 5 } = parseInput(promptText);

    const leadsDir = path.join(dataDir, 'leads');
    const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;
    const leadRecords = await listLeadRecords(leadsDir);

    if (leadRecords.length === 0) {
        return { success: true, leads: [] };
    }

    leadRecords.sort((left, right) => getLeadTimestamp(right) - getLeadTimestamp(left));
    const recentLeads = leadRecords.slice(0, normalizedLimit).map((leadRecord) => ({
        leadId: leadRecord.fileName,
        status: leadRecord.parsed.status || 'unknown',
        profile: leadRecord.parsed.profile || 'unknown',
        summary: leadRecord.parsed.summary || '',
        createdAt: leadRecord.parsed.createdAt || toIsoTimestamp(new Date(getLeadTimestamp(leadRecord))),
    }));

    return { success: true, leads: recentLeads };
}
