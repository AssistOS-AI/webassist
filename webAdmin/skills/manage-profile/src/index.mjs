import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDirectory } from '../../../../webassist-shared/dataStore.mjs';

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

function renderListSection(items) {
    return items.length > 0
        ? items.map((item) => `- ${item}`).join('\n')
        : '*None*';
}

function renderProfileMarkdown({ characteristics, interests, qualifyingCriteria }) {
    return [
        '## Characteristics',
        renderListSection(characteristics),
        '',
        '## Interests',
        renderListSection(interests),
        '',
        '## Qualifying criteria',
        renderListSection(qualifyingCriteria),
    ].join('\n');
}

export async function action({ promptText, dataDir = './data' }) {
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

    const profilesDir = path.join(dataDir, 'profilesInfo');
    const existingFileName = await findExistingProfileFile(profilesDir, normalizedProfileName.fileName);
    const fileName = existingFileName || normalizedProfileName.fileName;
    const profilePath = path.join(profilesDir, fileName);

    await ensureDirectory(profilesDir);
    const content = renderProfileMarkdown({
        characteristics: normalizedCharacteristics.items,
        interests: normalizedInterests.items,
        qualifyingCriteria: normalizedCriteria.items,
    });
    await fs.writeFile(profilePath, `${content}\n`, 'utf8');

    return {
        success: true,
        created: !existingFileName,
        updated: Boolean(existingFileName),
        profileName: fileName,
        profilePath,
        profile: {
            characteristics: normalizedCharacteristics.items,
            interests: normalizedInterests.items,
            qualifyingCriteria: normalizedCriteria.items,
        },
    };
}
