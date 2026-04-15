import path from 'node:path';

import {
    createLeadFileName,
    readLeadFile,
    toIsoTimestamp,
    writeLeadFile,
} from '../../../../webassist-shared/dataStore.mjs';

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('createLead expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('createLead input must be an object.');
    }
    return parsed;
}

function normalizeContactInfo(contactInfo) {
    const entries = Object.entries(contactInfo ?? {})
        .map(([key, value]) => [String(key).trim(), String(value ?? '').trim()])
        .filter(([key, value]) => key && value);

    if (entries.length === 0) {
        throw new Error('createLead requires at least one contact detail.');
    }

    return Object.fromEntries(entries);
}

export async function action({ promptText, dataDir = './data' }) {
    const {
        sessionId,
        contactInfo,
        profile,
        summary,
    } = parseInput(promptText);

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
