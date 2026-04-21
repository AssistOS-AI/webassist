import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RecursiveSkilledAgent } from 'achillesAgentLib';
import { loadContext } from './runtime/load-context.mjs';
import { configureDataStore, getConfiguredDataDir } from './runtime/dataStore.mjs';
import { updateSession } from './runtime/update-session.mjs';

function getDefaultAgentRoot() {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function uniqueStrings(values) {
    const seen = new Set();
    const result = [];

    for (const value of values ?? []) {
        const normalized = typeof value === 'string' ? value.trim() : '';
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }

    return result;
}

function buildBaseAgentOptions({ agentRoot, llmAgent, logger, sessionConfig, recursiveAgentOptions }) {
    const explicitSkillRoot = path.join(agentRoot, 'skills');
    const requestedSkillRoots = Array.isArray(recursiveAgentOptions?.additionalSkillRoots)
        ? recursiveAgentOptions.additionalSkillRoots
        : [];
    const additionalSkillRoots = [explicitSkillRoot, ...requestedSkillRoots]
        .filter((value, index, all) => value && all.indexOf(value) === index);

    return {
        llmAgent,
        logger,
        startDir: agentRoot,
        searchUpwards: false,
        sessionConfig,
        additionalSkillRoots,
        ...(recursiveAgentOptions ?? {}),
    };
}

function buildOrchestrationPrompt({ sessionId, message, context }) {
    return [
        'WebCli visitor turn request.',
        `Session ID: ${sessionId}`,
        'User message:',
        String(message),
        'Context about the current session, existing profiles, website information:',
        JSON.stringify(context ?? {}, null, 2),
    ].join('\n');
}

function normalizeRuntimeResult(executionResult) {
    let payload = executionResult?.result;
    if (typeof payload === 'string') {
        try {
            payload = JSON.parse(payload);
        } catch {
            payload = { response: payload };
        }
    }
    if (!payload || typeof payload !== 'object') {
        throw new Error('webCli orchestrator must return an object result.');
    }

    const response = String(payload.response ?? '').trim();
    if (!response) {
        throw new Error('webCli orchestrator result must include a non-empty response.');
    }

    return {
        response,
        profiles: uniqueStrings(payload.profiles),
        profileDetails: uniqueStrings(payload.profileDetails),
        contactInformation: payload.contactInformation,
    };
}

export async function createWebCliAgent({
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
        async handleMessage({ sessionId, message, mode = 'fast' }) {
            if (!sessionId) {
                throw new Error('webCli.handleMessage requires a sessionId.');
            }
            if (!message) {
                throw new Error('webCli.handleMessage requires a message.');
            }

            const context = await loadContext({
                sessionId,
            });

            const execution = await recursiveAgent.executePrompt(buildOrchestrationPrompt({
                sessionId,
                message,
                context,
            }), {
                model: mode,
                context: {
                    sessionId,
                    dataDir: resolvedDataDir,
                    webcli: {
                        sessionId,
                        dataDir: resolvedDataDir,
                        context,
                    },
                },
            });

            const normalized = normalizeRuntimeResult(execution);

            const sessionResult = await updateSession({
                sessionId,
                userMessage: message,
                agentResponse: normalized.response,
                profiles: normalized.profiles,
                profileDetails: normalized.profileDetails,
                contactInformation: normalized.contactInformation,
            });

            return {
                response: normalized.response,
                profiles: normalized.profiles,
                profileDetails: normalized.profileDetails,
                contactInformation: normalized.contactInformation,
                session: sessionResult.session,
            };
        },
    };
}
