import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const SEED_DATA_DIR = path.join(FIXTURES_DIR, 'seed-data');

export async function createWebAdminSandbox() {
    const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'webadmin-agent-'));
    const agentRoot = path.join(sandboxRoot, 'agent-root');
    const dataDir = path.join(agentRoot, 'data');

    await fs.mkdir(agentRoot, { recursive: true });
    await fs.cp(SEED_DATA_DIR, dataDir, { recursive: true });

    return {
        sandboxRoot,
        agentRoot,
        dataDir,
        async cleanup() {
            await fs.rm(sandboxRoot, { recursive: true, force: true });
        },
    };
}
