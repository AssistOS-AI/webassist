import path from 'node:path';

import {
    readSessionFile,
    writeSessionFile,
} from '../../../webassist-shared/dataStore.mjs';

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
    dataDir,
}) {
    if (!sessionId || !userMessage || !agentResponse) {
        throw new Error('update-session requires sessionId, userMessage, and agentResponse.');
    }

    const sessionPath = path.join(dataDir, 'sessions', `${sessionId}.md`);
    const existingSession = await readSessionFile(sessionPath);
    const nextSession = {
        profiles: uniqueStrings(profiles),
        profileDetails: uniqueStrings(profileDetails),
        history: [
            ...existingSession.parsed.history,
            { role: 'user', message: userMessage },
            { role: 'agent', message: agentResponse },
        ],
    };

    const content = await writeSessionFile(sessionPath, nextSession);

    return {
        success: true,
        sessionId,
        sessionPath,
        session: {
            ...nextSession,
            rawContent: content,
        },
    };
}
