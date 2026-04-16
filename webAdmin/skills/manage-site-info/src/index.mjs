import fs from 'node:fs/promises';
import path from 'node:path';
import { getConfiguredDataDir, getDataStore } from '../../../src/runtime/dataStore.mjs';
import { DATASTORE_TYPES } from '../../../src/constants/datastore.mjs';

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('manage-site-info expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('manage-site-info input must be an object.');
    }
    return parsed;
}

function sanitizeName(value) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
        return '';
    }
    const cleaned = trimmed.replace(/[/\\]/g, '');
    return cleaned.endsWith('.md') ? cleaned.slice(0, -3) : cleaned;
}

function deriveNameFromContent(text, fallbackIndex = 1) {
    const base = String(text ?? '').trim();
    if (!base) {
        return `site-info-${fallbackIndex}`;
    }
    const normalized = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || `site-info-${fallbackIndex}`;
}

function resolveReadTarget(payload) {
    return sanitizeName(payload.readFile || payload.fileName);
}

async function fileExists(filePath) {
    try {
        await fs.stat(filePath);
        return true;
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

async function writeInfoFile(store, dataDir, fileName, content) {
    const filePath = path.join(dataDir, DATASTORE_TYPES.INFO, `${fileName}.md`);
    const exists = await fileExists(filePath);
    await store.replaceFile(DATASTORE_TYPES.INFO, fileName, { Content: String(content ?? '') });
    return { fileName: `${fileName}.md`, created: !exists, updated: exists };
}

async function readInfoFile(store, fileName) {
    const fullName = `${fileName}.md`;
    const file = await store.getFile(DATASTORE_TYPES.INFO, fileName);
    const rendered = file.sections.map((section) => String(section.content ?? '').trim() || '*None*').join('\n\n').trim();
    return {
        fileName: fullName,
        content: rendered,
    };
}

export async function action({ promptText }) {
    const payload = parseInput(promptText);
    const store = getDataStore();
    const dataDir = getConfiguredDataDir();
    const created = [];
    const updated = [];

    const readTarget = resolveReadTarget(payload);
    if (readTarget && typeof payload.content !== 'string' && !Array.isArray(payload.files)) {
        const name = readTarget;
        if (!name) {
            return { success: false, error: 'fileName is required for read operations.' };
        }
        try {
            const result = await readInfoFile(store, name);
            return {
                success: true,
                content: `# ${result.fileName}\n\n${result.content.trim()}`,
            };
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                return { success: false, error: `File not found: ${name}.md` };
            }
            throw error;
        }
    }

    const files = Array.isArray(payload.files) ? payload.files : null;
    if (files && files.length > 0) {
        let index = 1;
        for (const entry of files) {
            const fileName = sanitizeName(entry?.name)
                || deriveNameFromContent(entry?.promptText || entry?.content, index);
            const content = typeof entry?.content === 'string' ? entry.content : '';
            const result = await writeInfoFile(store, dataDir, fileName, content);
            if (result.created) {
                created.push(result.fileName);
            } else {
                updated.push(result.fileName);
            }
            index += 1;
        }
        return { success: true, created, updated };
    }

    if (typeof payload.content === 'string') {
        const fileName = sanitizeName(payload.fileName)
            || deriveNameFromContent(payload.promptText || payload.content, 1);
        if (!fileName) {
            return { success: false, error: 'fileName is required.' };
        }
        const result = await writeInfoFile(store, dataDir, fileName, payload.content);
        if (result.created) {
            created.push(result.fileName);
        } else {
            updated.push(result.fileName);
        }
        return { success: true, created, updated };
    }

    return { success: false, error: 'No action requested.' };
}
