import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDirectory } from '../../../../webassist-shared/dataStore.mjs';

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

async function writeInfoFile(infoDir, fileName, content) {
    const fullName = `${fileName}.md`;
    const filePath = path.join(infoDir, fullName);
    const exists = await fileExists(filePath);
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
    return { fileName: fullName, created: !exists, updated: exists };
}

async function readInfoFile(infoDir, fileName) {
    const fullName = `${fileName}.md`;
    const filePath = path.join(infoDir, fullName);
    const content = await fs.readFile(filePath, 'utf8');
    return {
        fileName: fullName,
        content,
    };
}

export async function action({ promptText, dataDir = './data' }) {
    const payload = parseInput(promptText);
    const infoDir = path.join(dataDir, 'info');
    const created = [];
    const updated = [];

    const readTarget = resolveReadTarget(payload);
    if (readTarget && typeof payload.content !== 'string' && !Array.isArray(payload.files)) {
        const name = readTarget;
        if (!name) {
            return { success: false, error: 'fileName is required for read operations.' };
        }
        try {
            const result = await readInfoFile(infoDir, name);
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
        await ensureDirectory(infoDir);
        let index = 1;
        for (const entry of files) {
            const fileName = sanitizeName(entry?.name)
                || deriveNameFromContent(entry?.promptText || entry?.content, index);
            const content = typeof entry?.content === 'string' ? entry.content : '';
            const result = await writeInfoFile(infoDir, fileName, content);
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
        await ensureDirectory(infoDir);
        const result = await writeInfoFile(infoDir, fileName, payload.content);
        if (result.created) {
            created.push(result.fileName);
        } else {
            updated.push(result.fileName);
        }
        return { success: true, created, updated };
    }

    return { success: false, error: 'No action requested.' };
}
