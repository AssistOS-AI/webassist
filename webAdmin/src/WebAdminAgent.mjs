import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RecursiveSkilledAgent } from "achillesAgentLib";
import {
    configureDataStore,
    getConfiguredDataDir,
    getDataStore,
} from './runtime/dataStore.mjs';
import { loadContext } from './runtime/load-context.mjs';
import { DATASTORE_TYPES } from './constants/datastore.mjs';

function getDefaultAgentRoot() {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function buildBaseAgentOptions({ agentRoot, llmAgent, logger, sessionConfig, recursiveAgentOptions }) {
    const explicitSkillRoot = path.join(agentRoot, 'skills');
    const requestedSkillRoots = Array.isArray(recursiveAgentOptions?.additionalSkillRoots)
        ? recursiveAgentOptions.additionalSkillRoots
        : [];
    const additionalSkillRoots = [explicitSkillRoot, ...requestedSkillRoots]
        .filter((value, index, all) => value && all.indexOf(value) === index);

    const baseOptions = {
        llmAgent,
        logger,
        startDir: agentRoot,
        searchUpwards: false,
        sessionConfig,
        additionalSkillRoots,
        ...(recursiveAgentOptions ?? {}),
    };

    return baseOptions;
}

function buildOrchestrationPrompt({ message, availableLeadIds, preloadedContext }) {
    return [
        'WebAdmin owner request.',
        'Owner message:',
        String(message),
        'Known lead IDs:',
        availableLeadIds.length > 0 ? availableLeadIds.join('\n') : 'No leads available yet.',
        'Known profile templates:',
        String(preloadedContext?.combinedProfiles ?? 'No profiles available.'),
        'Owner info snapshot:',
        String(preloadedContext?.combinedOwnerInfo ?? 'No owner info available.'),
        'Website info snapshot:',
        String(preloadedContext?.combinedSiteInfo ?? 'No site info available.'),
    ].join('\n');
}

function normalizeRuntimeResult(executionResult) {
    const response = String(executionResult?.result ?? '').trim();
    if (!response) {
        throw new Error('webAdmin orchestrator must return a non-empty response.');
    }

    return {
        response,
    };
}

async function listLeadIds() {
    const store = getDataStore();
    const leadFiles = await store.listFiles(DATASTORE_TYPES.LEADS);
    return leadFiles.files.map((fileName) => `${fileName}.md`);
}

export async function createWebAdminAgent({
    agentRoot = getDefaultAgentRoot(),
    dataDir = null,
    llmAgent = null,
    logger = console,
    sessionConfig = {},
    recursiveAgentOptions = {},
} = {}) {
    const resolvedAgentRoot = path.resolve(agentRoot);
    configureDataStore({
        agentRoot: resolvedAgentRoot,
        dataDir,
    });
    const resolvedDataDir = getConfiguredDataDir();

    const recursiveAgent = new RecursiveSkilledAgent(buildBaseAgentOptions({
        agentRoot: resolvedAgentRoot,
        llmAgent,
        logger,
        sessionConfig,
        recursiveAgentOptions,
    }));

    return {
        achilles: {
            libraryName: 'achillesAgentLib',
            source: 'node_modules',
        },
        agentRoot: resolvedAgentRoot,
        dataDir: resolvedDataDir,
        recursiveAgent,
        async handleMessage({ sessionId = null, message, mode = 'fast', referenceDate = new Date() }) {
            if (!message) {
                throw new Error('webAdmin.handleMessage requires a message.');
            }

            const availableLeadIds = await listLeadIds();
            const preloadedContext = await loadContext();
            const execution = await recursiveAgent.executePrompt(buildOrchestrationPrompt({
                message,
                availableLeadIds,
                preloadedContext,
            }), {
                model: mode,
                context: {
                    ...(sessionId ? { sessionId } : {}),
                    dataDir: resolvedDataDir,
                    referenceDate,
                    webadmin: {
                        ...(sessionId ? { sessionId } : {}),
                        dataDir: resolvedDataDir,
                        availableLeadIds,
                        preloadedContext,
                        referenceDate,
                    },
                },
            });

            return normalizeRuntimeResult(execution);
        },
    };
}
