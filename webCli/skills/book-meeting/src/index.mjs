import path from 'node:path';

import {
    combineMarkdownFiles,
    readMarkdownDirectory,
} from '../../../../shared/dataStore.mjs';

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('bookMeeting expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('bookMeeting input must be an object.');
    }
    return parsed;
}

export async function action({ promptText, dataDir = './data' }) {
    const { sessionId } = parseInput(promptText);

    if (!sessionId) {
        throw new Error('bookMeeting requires a sessionId.');
    }

    const configFiles = await readMarkdownDirectory(path.join(dataDir, 'config'));
    if (configFiles.length === 0) {
        throw new Error('No configuration found to book a meeting.');
    }

    return combineMarkdownFiles(configFiles, 'Config');
}
