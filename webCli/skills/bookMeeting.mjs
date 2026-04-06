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
    const configFiles = await readMarkdownDirectory(path.join(dataDir, 'config'));
    if (configFiles.length === 0) {
        return { success: false, error: 'No configuration found to book a meeting.' };
    }

    return {
        success: true,
        sessionId,
        configData: combineMarkdownFiles(configFiles, 'Config'),
    };
}
