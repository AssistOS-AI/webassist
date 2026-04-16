import {
    getDataStore,
} from './dataStore.mjs';
import { DATASTORE_TYPES, SESSION_SECTIONS } from '../constants/datastore.mjs';

async function listMarkdownFiles(store, type) {
    const listing = await store.listFiles(type);
    const files = await Promise.all(
        listing.files.map(async (itemName) => {
            const file = await store.getFile(type, itemName);
            return {
                fileName: `${itemName}.md`,
                content: file.rawMarkdown,
            };
        })
    );
    return files;
}

function combineMarkdownFiles(files, label) {
    if (!Array.isArray(files) || files.length === 0) {
        return '';
    }
    return files
        .map(({ fileName, content }) => `--- [${label}: ${fileName}] ---\n${String(content ?? '').trim()}`)
        .join('\n\n');
}

export async function loadContext({ sessionId }) {
    if (!sessionId) {
        throw new Error('load-context requires a sessionId.');
    }

    const store = getDataStore();
    const infoFiles = await listMarkdownFiles(store, DATASTORE_TYPES.INFO);
    const profileFiles = await listMarkdownFiles(store, DATASTORE_TYPES.PROFILES_INFO);
    let sessionRecord = null;
    try {
        const sectionMap = await store.getSectionMap(DATASTORE_TYPES.SESSIONS, sessionId);
        sessionRecord = {
            exists: true,
            content: sectionMap.rawMarkdown,
            parsed: {
                profiles: store.parseList(sectionMap.sections[SESSION_SECTIONS.PROFILE]),
                profileDetails: store.parseList(sectionMap.sections[SESSION_SECTIONS.PROFILE_DETAILS]),
                history: store.parseDialogue(sectionMap.sections[SESSION_SECTIONS.HISTORY]).map((entry) => ({
                    role: entry.speaker.toLowerCase(),
                    message: entry.message,
                })),
            },
        };
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            sessionRecord = {
                exists: false,
                content: '',
                parsed: { profiles: [], profileDetails: [], history: [] },
            };
        } else {
            throw error;
        }
    }

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
