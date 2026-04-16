import {
    getDataStore,
} from './dataStore.mjs';
import {
    DATASTORE_TYPES,
    SESSION_SECTIONS,
    getSessionHistoryFileName,
    getSessionProfileFileName,
} from '../constants/datastore.mjs';

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
    const profileFileName = getSessionProfileFileName(sessionId);
    const historyFileName = getSessionHistoryFileName(sessionId);
    const nextProfiles = uniqueStrings(profiles);
    const nextProfileDetails = uniqueStrings(profileDetails);
    const historyAppend = store.renderDialogue([
        { speaker: 'User', message: userMessage },
        { speaker: 'Agent', message: agentResponse },
    ]);
    let existingHistory = '*None*';
    try {
        const existing = await store.getSectionMap(DATASTORE_TYPES.SESSIONS, historyFileName);
        existingHistory = existing.sections[SESSION_SECTIONS.HISTORY] ?? '*None*';
    } catch (error) {
        if (!error || error.code !== 'ENOENT') {
            throw error;
        }
    }

    await store.replaceFile(DATASTORE_TYPES.SESSIONS, profileFileName, {
        [SESSION_SECTIONS.PROFILE]: store.renderList(nextProfiles),
        [SESSION_SECTIONS.PROFILE_DETAILS]: store.renderList(nextProfileDetails),
    });
    await store.replaceFile(DATASTORE_TYPES.SESSIONS, historyFileName, {
        [SESSION_SECTIONS.HISTORY]: existingHistory,
    });
    await store.appendToFile(DATASTORE_TYPES.SESSIONS, historyFileName, {
        sections: {
            [SESSION_SECTIONS.HISTORY]: historyAppend,
        },
    });
    const savedProfile = await store.getSectionMap(DATASTORE_TYPES.SESSIONS, profileFileName);
    const savedHistory = await store.getSectionMap(DATASTORE_TYPES.SESSIONS, historyFileName);
    const parsedHistory = store.parseDialogue(savedHistory.sections[SESSION_SECTIONS.HISTORY]).map((entry) => ({
        role: entry.speaker.toLowerCase(),
        message: entry.message,
    }));

    return {
        success: true,
        sessionId,
        sessionProfilePath: `${profileFileName}.md`,
        sessionHistoryPath: `${historyFileName}.md`,
        session: {
            profiles: nextProfiles,
            profileDetails: nextProfileDetails,
            history: parsedHistory,
            profileRawContent: savedProfile.rawMarkdown,
            historyRawContent: savedHistory.rawMarkdown,
            rawContent: [savedProfile.rawMarkdown, savedHistory.rawMarkdown].filter(Boolean).join('\n\n'),
        },
    };
}
