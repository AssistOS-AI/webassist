import path from 'node:path';

import {
    createLeadFileName,
    readLeadFile,
    toIsoTimestamp,
    writeLeadFile,
} from '../../shared/dataStore.mjs';

export const definition = {
    name: "createLead",
    description: "Creates a new lead file with contact info and profiling details.",
    input_schema: {
        type: "object",
        properties: {
            sessionId: { type: "string" },
            contactInfo: { type: "object", description: "Key-value pairs of contact data" },
            profile: { type: "string", description: "The single most relevant profile name" },
            summary: { type: "string", description: "A short summary explaining why this lead is valuable" }
        },
        required: ["sessionId", "contactInfo", "profile", "summary"]
    }
};

function normalizeContactInfo(contactInfo) {
    const entries = Object.entries(contactInfo ?? {})
        .map(([key, value]) => [String(key).trim(), String(value ?? '').trim()])
        .filter(([key, value]) => key && value);

    if (entries.length === 0) {
        throw new Error('createLead requires at least one contact detail.');
    }

    return Object.fromEntries(entries);
}

export async function handler({ sessionId, contactInfo, profile, summary }, dataDir = './data') {
    if (!sessionId || !profile || !summary) {
        throw new Error('createLead requires sessionId, profile, and summary.');
    }

    const normalizedContactInfo = normalizeContactInfo(contactInfo);
    const leadId = createLeadFileName(sessionId);
    const leadPath = path.join(dataDir, 'leads', leadId);
    const timestamp = toIsoTimestamp();

    let existingLead = null;
    try {
        existingLead = await readLeadFile(leadPath);
    } catch (error) {
        if (!error || error.code !== 'ENOENT') {
            throw error;
        }
    }

    const leadRecord = {
        status: existingLead?.parsed?.status || 'new',
        profile,
        sessionId,
        contactInfo: normalizedContactInfo,
        summary,
        createdAt: existingLead?.parsed?.createdAt || timestamp,
        updatedAt: timestamp,
    };

    const content = await writeLeadFile(leadPath, leadRecord);

    return {
        success: true,
        created: !existingLead,
        leadId,
        leadPath,
        lead: {
            ...leadRecord,
            rawContent: content,
        },
    };
}
