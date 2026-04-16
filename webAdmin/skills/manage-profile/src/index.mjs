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

function normalizeSectionLabels(sections) {
    if (!sections) {
        return { ok: true, labels: null };
    }
    if (!Array.isArray(sections)) {
        return { ok: false, error: 'sections must be an array of strings.' };
    }

    const labels = [];
    const seen = new Set();
    for (const entry of sections) {
        const normalized = typeof entry === 'string' ? entry.trim() : '';
        if (!normalized) {
            continue;
        }
        const key = normalized.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        labels.push(normalized);
    }
    return { ok: true, labels };
}

function resolveSectionNames(sectionLabels) {
    if (!sectionLabels) {
        return null;
    }

    const resolved = new Set();
    const unknown = [];

    for (const label of sectionLabels) {
        const normalized = label.toLowerCase();
        if (normalized.includes('character')) {
            resolved.add(PROFILE_SECTIONS.CHARACTERISTICS);
            continue;
        }
        if (normalized.includes('interest')) {
            resolved.add(PROFILE_SECTIONS.INTERESTS);
            continue;
        }
        if (normalized.includes('criteria') || normalized.includes('qualify')) {
            resolved.add(PROFILE_SECTIONS.QUALIFYING_CRITERIA);
            continue;
        }
        unknown.push(label);
    }

    if (resolved.size === 0 && unknown.length > 0) {
        return [
            PROFILE_SECTIONS.CHARACTERISTICS,
            PROFILE_SECTIONS.INTERESTS,
            PROFILE_SECTIONS.QUALIFYING_CRITERIA,
        ];
    }

    return Array.from(resolved);
}

function stripExtension(fileName) {
    return fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName;
}

function renderSections(sections) {
    return sections
        .map((section) => `## ${section.name}\n${String(section.content ?? '').trim() || '*None*'}`)
        .join('\n\n')
        .trim();
}

export async function action({ promptText }) {
    const {
        profileName,
        characteristics,
        interests,
        qualifyingCriteria,
        sections,
    } = parseInput(promptText);

    const store = getDataStore();
    const profilesDir = path.join(getConfiguredDataDir(), DATASTORE_TYPES.PROFILES_INFO);
    const hasWritePayload = characteristics !== undefined
        || interests !== undefined
        || qualifyingCriteria !== undefined;

    if (!profileName && !hasWritePayload) {
        const listing = await store.listFiles(DATASTORE_TYPES.PROFILES_INFO);
        const profiles = listing.files
            .map((file) => stripExtension(`${file}.md`))
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right));
        return {
            success: true,
            profiles,
        };
    }

    const normalizedProfileName = normalizeProfileFileName(profileName);
    if (!normalizedProfileName.ok) {
        return { success: false, error: normalizedProfileName.error };
    }

    const existingFileName = await findExistingProfileFile(profilesDir, normalizedProfileName.fileName);
    const fileName = (existingFileName || normalizedProfileName.fileName).replace(/\.md$/i, '');

    if (!hasWritePayload) {
        if (!existingFileName) {
            return { success: false, error: `Profile not found: ${profileName}` };
        }

        const normalizedSections = normalizeSectionLabels(sections);
        if (!normalizedSections.ok) {
            return { success: false, error: normalizedSections.error };
        }
        const sectionNames = resolveSectionNames(normalizedSections.labels);
        const profileData = sectionNames
            ? await store.getFile(DATASTORE_TYPES.PROFILES_INFO, fileName, sectionNames)
            : await store.getFile(DATASTORE_TYPES.PROFILES_INFO, fileName);

        return {
            success: true,
            profileName: stripExtension(`${fileName}.md`),
            content: renderSections(profileData.sections),
            sectionsDisplayed: profileData.sections.map((section) => section.name),
        };
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
