import path from 'node:path';

import {
    normalizeLeadId,
    readLeadFile,
    toIsoTimestamp,
    writeLeadFile,
} from '../../../../webassist-shared/dataStore.mjs';

const ALLOWED_STATUSES = new Set(['invalid', 'contacted', 'converted']);

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('updateLead expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('updateLead input must be an object.');
    }
    return parsed;
}

export async function action({ promptText, dataDir = './data' }) {
    const { leadId, newStatus } = parseInput(promptText);

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
