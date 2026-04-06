import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const SEED_DATA_DIR = path.join(FIXTURES_DIR, 'seed-data');
const FAKE_LIBRARY_DIR = path.join(FIXTURES_DIR, 'AchillesAgentLib');

export async function createWebCliSandbox() {
    const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'webcli-agent-'));
    const agentRoot = path.join(sandboxRoot, 'agent-root');
    const dataDir = path.join(agentRoot, 'data');

    await fs.mkdir(agentRoot, { recursive: true });
    await fs.cp(SEED_DATA_DIR, dataDir, { recursive: true });
    await fs.cp(FAKE_LIBRARY_DIR, path.join(sandboxRoot, 'AchillesAgentLib'), { recursive: true });

    return {
        sandboxRoot,
        agentRoot,
        dataDir,
        async cleanup() {
            await fs.rm(sandboxRoot, { recursive: true, force: true });
        },
    };
}
