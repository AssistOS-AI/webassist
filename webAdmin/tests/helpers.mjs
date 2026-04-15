import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const SEED_DATA_DIR = path.join(FIXTURES_DIR, 'seed-data');
const SOURCE_SKILLS_DIR = path.resolve(FIXTURES_DIR, '..', '..', 'skills');
const SOURCE_SHARED_DIR = path.resolve(FIXTURES_DIR, '..', '..', '..', 'webassist-shared');

export async function createWebAdminSandbox() {
    const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'webadmin-agent-'));
    const agentRoot = path.join(sandboxRoot, 'agent-root');
    const dataDir = path.join(agentRoot, 'data');
    const skillsDir = path.join(agentRoot, 'skills');
    const sharedDir = path.join(sandboxRoot, 'webassist-shared');

    await fs.mkdir(agentRoot, { recursive: true });
    await fs.cp(SEED_DATA_DIR, dataDir, { recursive: true });
    await fs.cp(SOURCE_SKILLS_DIR, skillsDir, { recursive: true });
    await fs.cp(SOURCE_SHARED_DIR, sharedDir, { recursive: true });

    return {
        sandboxRoot,
        agentRoot,
        dataDir,
        async cleanup() {
            await fs.rm(sandboxRoot, { recursive: true, force: true });
        },
    };
}
