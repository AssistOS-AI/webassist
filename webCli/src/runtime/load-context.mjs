import {
    getDataStore,
} from './dataStore.mjs';
import {
    DATASTORE_TYPES,
    SESSION_SECTIONS,
    getSessionProfileFileName,
} from '../constants/datastore.mjs';

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
    const sessionProfileFileName = getSessionProfileFileName(sessionId);
    let sessionRecord = null;
    const emptyRecord = { profiles: [], profileDetails: [], history: [] };
    const readSectionMap = async (fileName) => {
        try {
            return await store.getSectionMap(DATASTORE_TYPES.SESSIONS, fileName);
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    };
    const profileRecord = await readSectionMap(sessionProfileFileName);
    const exists = Boolean(profileRecord);
    if (!exists) {
        sessionRecord = {
            exists: false,
            content: '',
            parsed: emptyRecord,
        };
    } else {
        const combined = `--- [Session Profile: ${sessionProfileFileName}.md] ---\n${profileRecord.rawMarkdown.trim()}`;
        sessionRecord = {
            exists: true,
            content: combined,
            parsed: {
                profiles: store.parseList(profileRecord?.sections?.[SESSION_SECTIONS.PROFILE]),
                profileDetails: store.parseList(profileRecord?.sections?.[SESSION_SECTIONS.PROFILE_DETAILS]),
                history: [],
            },
        };
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
            : 'No previous session profile found. This is a new session.',
    };
}
