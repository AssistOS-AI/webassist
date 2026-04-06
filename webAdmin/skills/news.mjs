import path from 'node:path';

import {
    getLeadTimestamp,
    listLeadRecords,
    toIsoTimestamp,
} from '../../shared/dataStore.mjs';

export const definition = {
    name: "news",
    description: "Lists the most recent leads added to the system.",
    input_schema: {
        type: "object",
        properties: {
            limit: { type: "number", description: "Max number of leads to return", default: 5 }
        }
    }
};

export async function handler({ limit = 5 }, dataDir = './data') {
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
