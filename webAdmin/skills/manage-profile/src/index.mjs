import fs from 'node:fs/promises';
import path from 'node:path';

import { getConfiguredDataDir, getDataStore } from '../../../src/runtime/dataStore.mjs';
import { DATASTORE_TYPES, PROFILE_SECTIONS } from '../../../src/constants/datastore.mjs';

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('manage-profile expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('manage-profile input must be an object.');
    }
    return parsed;
}

function normalizeStringList(value, fieldName) {
    if (value === undefined) {
        return { ok: true, items: [] };
    }
    if (!Array.isArray(value)) {
        return { ok: false, error: `${fieldName} must be an array of strings.` };
    }

    const items = [];
    const seen = new Set();
    for (const entry of value) {
        const normalized = typeof entry === 'string' ? entry.trim() : '';
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        items.push(normalized);
    }

    return { ok: true, items };
}

function normalizeProfileFileName(profileName) {
    const trimmed = typeof profileName === 'string' ? profileName.trim() : '';
    if (!trimmed) {
        return { ok: false, error: 'profileName is required.' };
    }
    if (trimmed.includes('/') || trimmed.includes('\\')) {
        return { ok: false, error: 'profileName must not include path separators.' };
    }

    const fileName = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`;
    if (path.basename(fileName) !== fileName) {
        return { ok: false, error: 'profileName must be a simple file name.' };
    }

    return { ok: true, fileName };
}

async function findExistingProfileFile(profilesDir, fileName) {
    const target = fileName.toLowerCase();
    let entries;
    try {
        entries = await fs.readdir(profilesDir, { withFileTypes: true });
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }

    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) {
            continue;
        }
        if (entry.name.toLowerCase() === target) {
            return entry.name;
        }
    }

    return null;
}

export async function action({ promptText }) {
    const {
        profileName,
        characteristics,
        interests,
        qualifyingCriteria,
    } = parseInput(promptText);

    const normalizedProfileName = normalizeProfileFileName(profileName);
    if (!normalizedProfileName.ok) {
        return { success: false, error: normalizedProfileName.error };
    }

    const normalizedCharacteristics = normalizeStringList(characteristics, 'characteristics');
    if (!normalizedCharacteristics.ok) {
        return { success: false, error: normalizedCharacteristics.error };
    }

    const normalizedInterests = normalizeStringList(interests, 'interests');
    if (!normalizedInterests.ok) {
        return { success: false, error: normalizedInterests.error };
    }

    const normalizedCriteria = normalizeStringList(qualifyingCriteria, 'qualifyingCriteria');
    if (!normalizedCriteria.ok) {
        return { success: false, error: normalizedCriteria.error };
    }

    const store = getDataStore();
    const profilesDir = path.join(getConfiguredDataDir(), DATASTORE_TYPES.PROFILES_INFO);
    const existingFileName = await findExistingProfileFile(profilesDir, normalizedProfileName.fileName);
    const fileName = (existingFileName || normalizedProfileName.fileName).replace(/\.md$/i, '');

    try {
        const current = await store.getFile(DATASTORE_TYPES.PROFILES_INFO, fileName);
        if (current.sections.length > 0) {
            await store.deleteFile(
                DATASTORE_TYPES.PROFILES_INFO,
                fileName,
                current.sections.map((section) => section.index)
            );
        }
    } catch (error) {
        if (!error || error.code !== 'ENOENT') {
            throw error;
        }
    }

    await store.updateFile(DATASTORE_TYPES.PROFILES_INFO, fileName, {
        [PROFILE_SECTIONS.CHARACTERISTICS]: store.renderList(normalizedCharacteristics.items),
        [PROFILE_SECTIONS.INTERESTS]: store.renderList(normalizedInterests.items),
        [PROFILE_SECTIONS.QUALIFYING_CRITERIA]: store.renderList(normalizedCriteria.items),
    });
    const profilePath = path.join(profilesDir, `${fileName}.md`);

    return {
        success: true,
        created: !existingFileName,
        updated: Boolean(existingFileName),
        profileName: `${fileName}.md`,
        profilePath,
        profile: {
            characteristics: normalizedCharacteristics.items,
            interests: normalizedInterests.items,
            qualifyingCriteria: normalizedCriteria.items,
        },
    };
}
