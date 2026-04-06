import path from 'node:path';

import {
    extractSessionIdFromLeadId,
    normalizeLeadId,
    readLeadFile,
    readSessionFile,
} from '../../shared/dataStore.mjs';

export const definition = {
    name: "leadInfo",
    description: "Retrieves the full profile, contact info, status, and related session history for a specific lead.",
    input_schema: {
        type: "object",
        properties: {
            leadId: { type: "string", description: "The filename of the lead" }
        },
        required: ["leadId"]
    }
};

export async function handler({ leadId }, dataDir = './data') {
    if (!leadId) {
        return { success: false, error: 'leadId is required.' };
    }

    const normalizedLeadId = normalizeLeadId(leadId);

    try {
        const leadPath = path.join(dataDir, 'leads', normalizedLeadId);
        const leadRecord = await readLeadFile(leadPath);
        const sessionId = extractSessionIdFromLeadId(normalizedLeadId, leadRecord.parsed);

        if (!sessionId) {
            return { success: false, error: `Could not determine the session for ${normalizedLeadId}.` };
        }

        const sessionPath = path.join(dataDir, 'sessions', `${sessionId}.md`);
        const sessionRecord = await readSessionFile(sessionPath);

        return {
            success: true,
            info: {
                leadId: normalizedLeadId,
                sessionId,
                leadData: leadRecord.parsed,
                leadMarkdown: leadRecord.content,
                sessionHistory: sessionRecord.parsed,
                sessionMarkdown: sessionRecord.exists ? sessionRecord.content : null,
                sessionFound: sessionRecord.exists,
            },
        };

    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return { success: false, error: `Lead not found: ${normalizedLeadId}` };
        }
        throw error;
    }
}
