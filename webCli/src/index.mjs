import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createWebCliAgent } from './WebCliAgent.mjs';

function parseArguments(argv) {
    const flags = {};
    const positionals = [];

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (!argument.startsWith('--')) {
            positionals.push(argument);
            continue;
        }

        const [rawKey, inlineValue] = argument.slice(2).split('=');
        if (inlineValue !== undefined) {
            flags[rawKey] = inlineValue;
            continue;
        }

        const nextValue = argv[index + 1];
        if (nextValue && !nextValue.startsWith('--')) {
            flags[rawKey] = nextValue;
            index += 1;
            continue;
        }

        flags[rawKey] = true;
    }

    return { flags, positionals };
}

async function main() {
    const { flags, positionals } = parseArguments(process.argv.slice(2));
    const sessionId = flags['session-id'] || positionals[0];
    const message = flags.message || positionals[1];

    if (!sessionId || !message) {
        throw new Error('Usage: node webCli/src/index.mjs --session-id <id> --message <text> [--data-dir <dir>] [--agent-root <dir>] [--json]');
    }

    const agent = await createWebCliAgent({
        agentRoot: flags['agent-root'],
        dataDir: flags['data-dir'],
    });

    const result = await agent.handleMessage({ sessionId, message });
    if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    console.log(result.response);
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

export { createWebCliAgent } from './WebCliAgent.mjs';
