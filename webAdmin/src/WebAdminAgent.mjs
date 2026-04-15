import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RecursiveSkilledAgent } from "achillesAgentLib";
import { readMarkdownDirectory, resolveDataDir } from '../../webassist-shared/dataStore.mjs';

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

function buildOrchestrationPrompt({ message, availableLeadIds }) {
    return [
        'WebAdmin owner request.',
        'Owner message:',
        String(message),
        'Known lead IDs:',
        availableLeadIds.length > 0 ? availableLeadIds.join('\n') : 'No leads available yet.',
    ].join('\n');
}

function normalizeRuntimeResult(executionResult) {
    const response = String(executionResult?.result ?? '').trim();
    if (!response) {
        throw new Error('webAdmin orchestrator must return a non-empty response.');
    }

    return {
        success: true,
        response,
    };
}

async function listLeadIds(dataDir) {
    const leadFiles = await readMarkdownDirectory(path.join(dataDir, 'leads'));
    return leadFiles.map((file) => file.fileName);
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
    const resolvedDataDir = resolveDataDir(resolvedAgentRoot, dataDir);

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

            const availableLeadIds = await listLeadIds(resolvedDataDir);
            const execution = await recursiveAgent.executePrompt(buildOrchestrationPrompt({
                message,
                availableLeadIds,
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
                        referenceDate,
                    },
                },
            });

            return normalizeRuntimeResult(execution);
        },
    };
}
