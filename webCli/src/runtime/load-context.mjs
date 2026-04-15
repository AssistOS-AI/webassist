import path from 'node:path';

import {
    combineMarkdownFiles,
    readMarkdownDirectory,
    readSessionFile,
} from '../../../webassist-shared/dataStore.mjs';

export async function loadContext({ sessionId, dataDir }) {
    if (!sessionId) {
        throw new Error('load-context requires a sessionId.');
    }

    const infoFiles = await readMarkdownDirectory(path.join(dataDir, 'info'));
    const profileFiles = await readMarkdownDirectory(path.join(dataDir, 'profilesInfo'));
    const sessionRecord = await readSessionFile(path.join(dataDir, 'sessions', `${sessionId}.md`));

    return {
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
    };
}
