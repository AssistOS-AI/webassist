import {
    getDataStore,
} from './dataStore.mjs';
import { DATASTORE_TYPES, SESSION_SECTIONS } from '../constants/datastore.mjs';

function uniqueStrings(values) {
    const seen = new Set();
    const result = [];

    for (const value of values ?? []) {
        const normalized = typeof value === 'string' ? value.trim() : '';
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }

    return result;
}

export async function updateSession({
    sessionId,
    userMessage,
    agentResponse,
    profiles,
    profileDetails,
}) {
    if (!sessionId || !userMessage || !agentResponse) {
        throw new Error('update-session requires sessionId, userMessage, and agentResponse.');
    }

    const store = getDataStore();
    const nextProfiles = uniqueStrings(profiles);
    const nextProfileDetails = uniqueStrings(profileDetails);
    const historyAppend = store.renderDialogue([
        { speaker: 'User', message: userMessage },
        { speaker: 'Agent', message: agentResponse },
    ]);
    let existingHistory = '*None*';
    try {
        const existing = await store.getSectionMap(DATASTORE_TYPES.SESSIONS, sessionId);
        existingHistory = existing.sections[SESSION_SECTIONS.HISTORY] ?? '*None*';
    } catch (error) {
        if (!error || error.code !== 'ENOENT') {
            throw error;
        }
    }

    await store.replaceFile(DATASTORE_TYPES.SESSIONS, sessionId, {
        [SESSION_SECTIONS.PROFILE]: store.renderList(nextProfiles),
        [SESSION_SECTIONS.PROFILE_DETAILS]: store.renderList(nextProfileDetails),
        [SESSION_SECTIONS.HISTORY]: existingHistory,
    });
    await store.appendToFile(DATASTORE_TYPES.SESSIONS, sessionId, {
        sections: {
            [SESSION_SECTIONS.HISTORY]: historyAppend,
        },
    });
    const saved = await store.getSectionMap(DATASTORE_TYPES.SESSIONS, sessionId);
    const parsedHistory = store.parseDialogue(saved.sections[SESSION_SECTIONS.HISTORY]).map((entry) => ({
        role: entry.speaker.toLowerCase(),
        message: entry.message,
    }));

    return {
        success: true,
        sessionId,
        sessionPath: `${sessionId}.md`,
        session: {
            profiles: nextProfiles,
            profileDetails: nextProfileDetails,
            history: parsedHistory,
            rawContent: saved.rawMarkdown,
        },
    };
}
