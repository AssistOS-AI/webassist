import path from 'node:path';

import {
    combineMarkdownFiles,
    readMarkdownDirectory,
} from '../../shared/dataStore.mjs';

export const definition = {
    name: "bookMeeting",
    description: "Retrieves the owner's contact info or calendar links from configuration.",
    input_schema: {
        type: "object",
        properties: {
            sessionId: { type: "string" }
        },
        required: ["sessionId"]
    }
};

export async function handler({ sessionId }, dataDir = './data') {
    if (!sessionId) {
        throw new Error('bookMeeting requires a sessionId.');
    }

    const configFiles = await readMarkdownDirectory(path.join(dataDir, 'config'));
    if (configFiles.length === 0) {
        throw new Error('No configuration found to book a meeting.');
    }

    return combineMarkdownFiles(configFiles, 'Config');
}
