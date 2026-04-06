import path from 'node:path';

import {
    normalizeLeadId,
    readLeadFile,
    toIsoTimestamp,
    writeLeadFile,
} from '../../shared/dataStore.mjs';

export const definition = {
    name: "updateLead",
    description: "Updates the status of an existing lead.",
    input_schema: {
        type: "object",
        properties: {
            leadId: { type: "string", description: "Filename of the lead (e.g. session1-lead-123.md)" },
            newStatus: { type: "string", enum: ["invalid", "contacted", "converted"] }
        },
        required: ["leadId", "newStatus"]
    }
};

const ALLOWED_STATUSES = new Set(['invalid', 'contacted', 'converted']);

export async function handler({ leadId, newStatus }, dataDir = './data') {
    if (!leadId) {
        return { success: false, error: 'leadId is required.' };
    }
    if (!ALLOWED_STATUSES.has(newStatus)) {
        return { success: false, error: `Invalid status: ${newStatus}` };
    }

    const normalizedLeadId = normalizeLeadId(leadId);
    const leadPath = path.join(dataDir, 'leads', normalizedLeadId);

    let existingLead;
    try {
        existingLead = await readLeadFile(leadPath);
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return { success: false, error: `Lead not found: ${normalizedLeadId}` };
        }
        throw error;
    }

    const updatedLead = {
        ...existingLead.parsed,
        status: newStatus,
        updatedAt: toIsoTimestamp(),
    };
    const content = await writeLeadFile(leadPath, updatedLead);

    return {
        success: true,
        leadId: normalizedLeadId,
        lead: {
            ...updatedLead,
            rawContent: content,
        },
    };
}
