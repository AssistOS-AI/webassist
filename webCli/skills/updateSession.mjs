import path from 'node:path';

import {
    readSessionFile,
    writeSessionFile,
} from '../../shared/dataStore.mjs';

export const definition = {
    name: "updateSession",
    description: "Updates the session file with the latest user input, agent response, and current profiling assumptions.",
    input_schema: {
        type: "object",
        properties: {
            sessionId: { type: "string" },
            userMessage: { type: "string" },
            agentResponse: { type: "string" },
            profiles: { type: "array", items: { type: "string" } },
            profileDetails: { type: "array", items: { type: "string" } }
        },
        required: ["sessionId", "userMessage", "agentResponse", "profiles", "profileDetails"]
    }
};

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

export async function handler({ sessionId, userMessage, agentResponse, profiles, profileDetails }, dataDir = './data') {
    if (!sessionId || !userMessage || !agentResponse) {
        throw new Error('updateSession requires sessionId, userMessage, and agentResponse.');
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
