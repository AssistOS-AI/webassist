import {
    getDataStore,
} from './dataStore.mjs';
import {
    DATASTORE_TYPES,
    LEAD_FIELDS,
    LEAD_SECTIONS,
    SESSION_SECTIONS,
    getSessionLeadFileName,
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
    const sessionLeadFileName = getSessionLeadFileName(sessionId);
    let sessionRecord = null;
    let currentLeadState = null;
    const emptyRecord = { profiles: [], profileDetails: [], history: [] };
    const readSectionMap = async (type, fileName) => {
        try {
            return await store.getSectionMap(type, fileName);
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    };
    const profileRecord = await readSectionMap(DATASTORE_TYPES.SESSIONS, sessionProfileFileName);
    const leadRecord = await readSectionMap(DATASTORE_TYPES.LEADS, sessionLeadFileName);
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

    if (!leadRecord) {
        currentLeadState = {
            exists: false,
            leadId: `${sessionLeadFileName}.md`,
            status: '',
            profile: '',
            sessionId: '',
            contactInfo: {},
            summary: '',
        };
    } else {
        const leadInfo = store.parseKeyValue(leadRecord.sections?.[LEAD_SECTIONS.LEAD_INFO]);
        const contactInfo = store.parseKeyValue(leadRecord.sections?.[LEAD_SECTIONS.CONTACT_INFO]);
        currentLeadState = {
            exists: true,
            leadId: `${sessionLeadFileName}.md`,
            status: String(leadInfo?.[LEAD_FIELDS.STATUS] ?? '').trim(),
            profile: String(leadInfo?.[LEAD_FIELDS.PROFILE] ?? '').trim(),
            sessionId: String(leadInfo?.[LEAD_FIELDS.SESSION_ID] ?? '').trim(),
            contactInfo,
            summary: String(leadRecord.sections?.[LEAD_SECTIONS.SUMMARY] ?? '').trim(),
        };
    }

    return {
        siteInfo: infoFiles,
        profilesInfo: profileFiles,
        currentLeadState,
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
