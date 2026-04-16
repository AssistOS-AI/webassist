import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDirectory } from '../../../../webassist-shared/dataStore.mjs';

const PREFIXES = [
    { key: 'email', label: 'Email:' },
    { key: 'phone', label: 'Phone:' },
    { key: 'calendar', label: 'Calendar:' },
    { key: 'meeting', label: 'Meeting:' },
];

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('manage-owner-info expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('manage-owner-info input must be an object.');
    }
    return parsed;
}

function normalizeLine(line) {
    return String(line || '').trim();
}

function updateLines(existingLines, updates) {
    const lines = existingLines.map(normalizeLine).filter(Boolean);
    const remaining = new Set(Object.keys(updates));

    const nextLines = lines.map((line) => {
        for (const { key, label } of PREFIXES) {
            if (!updates[key]) {
                continue;
            }
            if (line.toLowerCase().startsWith(label.toLowerCase())) {
                remaining.delete(key);
                return `${label} ${updates[key]}`;
            }
        }
        return line;
    });

    for (const { key, label } of PREFIXES) {
        if (remaining.has(key) && updates[key]) {
            nextLines.push(`${label} ${updates[key]}`);
        }
    }

    return nextLines;
}

async function readOwnerFile(filePath) {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return '';
        }
        throw error;
    }
}

export async function action({ promptText, dataDir = './data' }) {
    const payload = parseInput(promptText);
    const configDir = path.join(dataDir, 'config');
    const ownerPath = path.join(configDir, 'owner.md');

    if (payload.read === true) {
        const content = await readOwnerFile(ownerPath);
        return {
            success: true,
            content: content.trim(),
        };
    }

    if (typeof payload.content === 'string' && payload.content.trim()) {
        await ensureDirectory(configDir);
        await fs.writeFile(ownerPath, `${payload.content.trim()}\n`, 'utf8');
        return { success: true, updated: true };
    }

    const updates = {};
    for (const { key } of PREFIXES) {
        if (typeof payload[key] === 'string' && payload[key].trim()) {
            updates[key] = payload[key].trim();
        }
    }

    if (Object.keys(updates).length === 0) {
        return { success: false, error: 'No updates provided.' };
    }

    await ensureDirectory(configDir);
    const existing = await readOwnerFile(ownerPath);
    const lines = existing ? existing.split(/\r?\n/) : [];
    const updatedLines = updateLines(lines, updates);
    await fs.writeFile(ownerPath, `${updatedLines.join('\n')}\n`, 'utf8');

    return { success: true, updated: true };
}
