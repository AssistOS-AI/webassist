import { getDataStore } from '../../../src/runtime/dataStore.mjs';
import { DATASTORE_TYPES, PROFILE_SECTIONS } from '../../../src/constants/datastore.mjs';

function parseInput(promptText) {
    if (promptText === undefined || promptText === null || String(promptText).trim() === '') {
        return {};
    }
    let parsed;
    try {
        parsed = JSON.parse(String(promptText));
    } catch {
        throw new Error('list-profiles expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('list-profiles input must be an object.');
    }
    return parsed;
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

async function findProfileByName(store, profileName) {
    const listing = await store.listFiles(DATASTORE_TYPES.PROFILES_INFO);
    const target = String(profileName ?? '').trim().toLowerCase().replace(/\.md$/, '');
    if (!target) {
        return null;
    }
    return listing.files.find((name) => name.toLowerCase() === target) ?? null;
}

export async function action({ promptText }) {
    const { profileName, sections } = parseInput(promptText);
    const store = getDataStore();

    if (profileName) {
        let existingFile;
        try {
            existingFile = await findProfileByName(store, profileName);
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                return { success: true, profiles: [] };
            }
            throw error;
        }

        if (!existingFile) {
            return { success: false, error: `Profile not found: ${profileName}` };
        }

        const normalizedSections = normalizeSectionLabels(sections);
        if (!normalizedSections.ok) {
            return { success: false, error: normalizedSections.error };
        }

        if (!normalizedSections.labels) {
            const full = await store.getFile(DATASTORE_TYPES.PROFILES_INFO, existingFile);
            return {
                success: true,
                profileName: stripExtension(`${existingFile}.md`),
                content: renderSections(full.sections),
                sectionsDisplayed: full.sections.map((section) => section.name),
            };
        }

        const sectionNames = resolveSectionNames(normalizedSections.labels);
        const filtered = await store.getFile(DATASTORE_TYPES.PROFILES_INFO, existingFile, sectionNames);
        return {
            success: true,
            profileName: stripExtension(`${existingFile}.md`),
            content: renderSections(filtered.sections),
            sectionsDisplayed: filtered.sections.map((section) => section.name),
        };
    }

    const listing = await store.listFiles(DATASTORE_TYPES.PROFILES_INFO);
    const profiles = listing.files
        .map((item) => stripExtension(`${item}.md`))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));

    return {
        success: true,
        profiles,
    };
}
