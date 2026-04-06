import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LIBRARY_DIR_NAMES = ['AchillesAgentLib', 'achillesAgentLib'];
const DEFAULT_ENTRY_FILES = [
    'index.mjs',
    'AgentLib.mjs',
    'index.js',
    path.join('dist', 'index.mjs'),
    path.join('dist', 'index.js'),
];

async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

async function readJsonIfPresent(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

function extractEntryFromPackageJson(packageJson) {
    if (!packageJson || typeof packageJson !== 'object') {
        return null;
    }

    const exportField = packageJson.exports;
    if (typeof exportField === 'string') {
        return exportField;
    }
    if (exportField && typeof exportField === 'object') {
        const rootExport = exportField['.'];
        if (typeof rootExport === 'string') {
            return rootExport;
        }
        if (rootExport && typeof rootExport === 'object') {
            for (const key of ['import', 'default', 'module', 'node']) {
                if (typeof rootExport[key] === 'string') {
                    return rootExport[key];
                }
            }
        }
    }

    if (typeof packageJson.main === 'string') {
        return packageJson.main;
    }

    return null;
}

async function resolveLibraryEntry(candidateDir) {
    const packageJsonPath = path.join(candidateDir, 'package.json');
    const packageJson = await readJsonIfPresent(packageJsonPath);
    const packageEntry = extractEntryFromPackageJson(packageJson);

    if (packageEntry) {
        const resolvedPackageEntry = path.resolve(candidateDir, packageEntry);
        if (await pathExists(resolvedPackageEntry)) {
            return resolvedPackageEntry;
        }
    }

    for (const entryFile of DEFAULT_ENTRY_FILES) {
        const resolvedEntry = path.resolve(candidateDir, entryFile);
        if (await pathExists(resolvedEntry)) {
            return resolvedEntry;
        }
    }

    throw new Error(`Found ${candidateDir} but could not determine its entry file.`);
}

function extractRecursiveSkilledAgent(moduleNamespace) {
    const directExport = moduleNamespace?.RecursiveSkilledAgent;
    if (typeof directExport === 'function') {
        return directExport;
    }

    const defaultExport = moduleNamespace?.default;
    if (typeof defaultExport === 'function') {
        return defaultExport;
    }
    if (typeof defaultExport?.RecursiveSkilledAgent === 'function') {
        return defaultExport.RecursiveSkilledAgent;
    }

    return null;
}

export async function locateAchillesAgentLib(agentRoot) {
    const resolvedAgentRoot = path.resolve(agentRoot);
    const parentDirectory = path.resolve(resolvedAgentRoot, '..');

    for (const libraryName of LIBRARY_DIR_NAMES) {
        const candidateDir = path.join(parentDirectory, libraryName);
        if (!await pathExists(candidateDir)) {
            continue;
        }

        const entryPath = await resolveLibraryEntry(candidateDir);
        return {
            agentRoot: resolvedAgentRoot,
            parentDirectory,
            libraryName,
            libraryDir: candidateDir,
            entryPath,
        };
    }

    throw new Error(
        `Could not locate AchillesAgentLib or achillesAgentLib in ${parentDirectory}.`
    );
}

export async function loadAchillesAgentLib(agentRoot) {
    const locatedLibrary = await locateAchillesAgentLib(agentRoot);
    const moduleNamespace = await import(pathToFileURL(locatedLibrary.entryPath).href);
    const RecursiveSkilledAgent = extractRecursiveSkilledAgent(moduleNamespace);

    if (typeof RecursiveSkilledAgent !== 'function') {
        throw new Error(
            `Loaded ${locatedLibrary.entryPath} but it does not export RecursiveSkilledAgent.`
        );
    }

    return {
        ...locatedLibrary,
        moduleNamespace,
        RecursiveSkilledAgent,
    };
}
