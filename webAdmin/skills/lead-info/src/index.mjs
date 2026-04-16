import {
    getDataStore,
} from '../../../src/runtime/dataStore.mjs';
import {
    DATASTORE_TYPES,
    LEAD_FIELDS,
    LEAD_SECTIONS,
    SESSION_SECTIONS,
    getSessionHistoryFileName,
    getSessionProfileFileName,
} from '../../../src/constants/datastore.mjs';

function normalizeLeadId(leadId) {
    const normalized = String(leadId ?? '').trim();
    if (!normalized) {
        throw new Error('leadId is required.');
    }
    return normalized.endsWith('.md') ? normalized.slice(0, -3) : normalized;
}

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('lead-info expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('lead-info input must be an object.');
    }
    return parsed;
}

export async function action({ promptText }) {
    const { leadId } = parseInput(promptText);

    if (!leadId) {
        return { success: false, error: 'leadId is required.' };
    }

    const store = getDataStore();
    const normalizedLeadId = normalizeLeadId(leadId);

    try {
        const leadRecord = await store.getSectionMap(DATASTORE_TYPES.LEADS, normalizedLeadId);
        const leadInfo = store.parseKeyValue(leadRecord.sections[LEAD_SECTIONS.LEAD_INFO]);
        const sessionId = String(leadInfo[LEAD_FIELDS.SESSION_ID] ?? '').trim()
            || (normalizeLeadId(normalizedLeadId).match(/^(.*)-lead(?:-[^.]+)?$/)?.[1] ?? null);

        if (!sessionId) {
            return { success: false, error: `Could not determine the session for ${normalizedLeadId}.` };
        }

        let sessionRecord;
        let sessionHistoryRecord;
        try {
            sessionRecord = await store.getSectionMap(DATASTORE_TYPES.SESSIONS, getSessionProfileFileName(sessionId));
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                sessionRecord = null;
            } else {
                throw error;
            }
        }
        try {
            sessionHistoryRecord = await store.getSectionMap(DATASTORE_TYPES.SESSIONS, getSessionHistoryFileName(sessionId));
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                sessionHistoryRecord = null;
            } else {
                throw error;
            }
        }

        const leadData = {
            status: leadInfo[LEAD_FIELDS.STATUS] ?? null,
            profile: leadInfo[LEAD_FIELDS.PROFILE] ?? null,
            sessionId: leadInfo[LEAD_FIELDS.SESSION_ID] ?? null,
            createdAt: leadInfo[LEAD_FIELDS.CREATED_AT] ?? null,
            updatedAt: leadInfo[LEAD_FIELDS.UPDATED_AT] ?? null,
            contactInfo: store.parseKeyValue(leadRecord.sections[LEAD_SECTIONS.CONTACT_INFO]),
            summary: String(leadRecord.sections[LEAD_SECTIONS.SUMMARY] ?? '').trim(),
            rawContent: leadRecord.rawMarkdown,
        };

        const historyRaw = sessionHistoryRecord?.sections?.[SESSION_SECTIONS.HISTORY] ?? '*None*';
        const sessionMarkdown = [
            sessionRecord ? `--- [Session Profile: ${getSessionProfileFileName(sessionId)}.md] ---\n${sessionRecord.rawMarkdown}` : '',
            sessionHistoryRecord ? `--- [Session History: ${getSessionHistoryFileName(sessionId)}.md] ---\n${sessionHistoryRecord.rawMarkdown}` : '',
        ].filter(Boolean).join('\n\n');
        const hasSessionData = Boolean(sessionRecord || sessionHistoryRecord);
        return {
            success: true,
            info: {
                leadId: normalizedLeadId,
                sessionId,
                leadData,
                leadMarkdown: leadRecord.rawMarkdown,
                sessionHistory: hasSessionData
                    ? {
                        profiles: store.parseList(sessionRecord?.sections?.[SESSION_SECTIONS.PROFILE]),
                        profileDetails: store.parseList(sessionRecord?.sections?.[SESSION_SECTIONS.PROFILE_DETAILS]),
                        history: store.parseDialogue(historyRaw).map((entry) => ({
                            role: entry.speaker.toLowerCase(),
                            message: entry.message,
                        })),
                        rawContent: sessionMarkdown,
                    }
                    : { profiles: [], profileDetails: [], history: [], rawContent: '' },
                sessionMarkdown: sessionMarkdown || null,
                sessionFound: hasSessionData,
            },
        };

    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return { success: false, error: `Lead not found: ${normalizedLeadId}` };
        }
        throw error;
    }
}
