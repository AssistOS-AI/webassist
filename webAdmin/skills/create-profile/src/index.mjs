import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDirectory } from '../../../../webassist-shared/dataStore.mjs';

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('create-profile expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('create-profile input must be an object.');
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
    const profilePath = path.join(profilesDir, normalizedProfileName.fileName);

    try {
        await fs.stat(profilePath);
        return {
            success: false,
            error: `Profile already exists: ${normalizedProfileName.fileName}`,
        };
    } catch (error) {
        if (!error || error.code !== 'ENOENT') {
            throw error;
        }
    }

    await ensureDirectory(profilesDir);
    const content = renderProfileMarkdown({
        characteristics: normalizedCharacteristics.items,
        interests: normalizedInterests.items,
        qualifyingCriteria: normalizedCriteria.items,
    });
    await fs.writeFile(profilePath, `${content}\n`, 'utf8');

    return {
        success: true,
        created: true,
        profileName: normalizedProfileName.fileName,
        profilePath,
        profile: {
            characteristics: normalizedCharacteristics.items,
            interests: normalizedInterests.items,
            qualifyingCriteria: normalizedCriteria.items,
        },
    };
}
