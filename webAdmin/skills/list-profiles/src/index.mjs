import path from 'node:path';

import { readMarkdownDirectory } from '../../../../webassist-shared/dataStore.mjs';

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

function stripExtension(fileName) {
    return fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName;
}

export async function action({ promptText, dataDir = './data' }) {
    parseInput(promptText);

    const profilesDir = path.join(dataDir, 'profilesInfo');
    const profileFiles = await readMarkdownDirectory(profilesDir);
    const profiles = profileFiles
        .map((file) => stripExtension(file.fileName))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));

    return {
        success: true,
        profiles,
    };
}
