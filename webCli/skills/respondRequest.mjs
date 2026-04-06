import path from 'node:path';

import {
    combineMarkdownFiles,
    readMarkdownDirectory,
    readSessionFile,
} from '../../shared/dataStore.mjs';

export const definition = {
    name: "respondRequest",
    description: "Gathers all relevant context (site info, available profiles, and current session state) needed to formulate a response to the user.",
    input_schema: {
        type: "object",
        properties: {
            sessionId: { type: "string" }
        },
        required: ["sessionId"]
    }
};

export async function handler({ sessionId }, dataDir = './data') {
    if (!sessionId) {
        throw new Error('respondRequest requires a sessionId.');
    }

    const infoFiles = await readMarkdownDirectory(path.join(dataDir, 'info'));
    const profileFiles = await readMarkdownDirectory(path.join(dataDir, 'profilesInfo'));
    const sessionRecord = await readSessionFile(path.join(dataDir, 'sessions', `${sessionId}.md`));

    return {
        success: true,
        context: {
            siteInfo: infoFiles,
            profilesInfo: profileFiles,
            currentSessionState: {
                sessionId,
                isNewSession: !sessionRecord.exists,
                ...sessionRecord.parsed,
            },
            combinedSiteInfo: combineMarkdownFiles(infoFiles, 'Info') || 'No site info available.',
            combinedProfilesInfo: combineMarkdownFiles(profileFiles, 'Profile') || 'No profiling info available.',
            currentSessionStateText: sessionRecord.exists
                ? sessionRecord.content.trim()
                : 'No previous session history found. This is a new session.',
        },
    };
}
