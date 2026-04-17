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

const FLOW_ASKED_REGEX = /^The user is asked about\s+(.+?)\.\s+His\/her next reply should answer the question\.?$/i;
const FLOW_UNANSWERED_REGEX = /^The user did not answer the question about\s+(.+?)\.?$/i;

function isFlowStatusLine(value) {
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = value.trim();
    return FLOW_ASKED_REGEX.test(normalized) || FLOW_UNANSWERED_REGEX.test(normalized);
}

function normalizeFlowTopic(value) {
    const normalized = String(value ?? '').trim().replace(/[.\s]+$/g, '');
    return normalized;
}

function extractPendingQuestionTopic(profileDetails) {
    const values = Array.isArray(profileDetails) ? profileDetails : [];
    for (let index = values.length - 1; index >= 0; index -= 1) {
        const entry = String(values[index] ?? '').trim();
        const match = entry.match(FLOW_ASKED_REGEX);
        if (match && match[1]) {
            const topic = normalizeFlowTopic(match[1]);
            if (topic) {
                return topic;
            }
        }
    }
    return '';
}

function buildAskedFlowLine(topic) {
    return `The user is asked about ${topic}. His/her next reply should answer the question.`;
}

function buildUnansweredFlowLine(topic) {
    return `The user did not answer the question about ${topic}.`;
}

function synthesizeProfileDetails({ currentProfileDetails, payloadProfileDetails, flow }) {
    const stableExistingDetails = uniqueStrings(currentProfileDetails).filter((value) => !isFlowStatusLine(value));
    const nextPayloadDetails = uniqueStrings(payloadProfileDetails).filter((value) => !isFlowStatusLine(value));
    const nextProfileDetails = uniqueStrings([...stableExistingDetails, ...nextPayloadDetails]);
    const previousPendingQuestionTopic = extractPendingQuestionTopic(currentProfileDetails);

    if (previousPendingQuestionTopic && flow.answeredPendingQuestion === false) {
        nextProfileDetails.push(buildUnansweredFlowLine(previousPendingQuestionTopic));
    }

    const pendingQuestionTopic = normalizeFlowTopic(flow.pendingQuestionTopic);
    if (pendingQuestionTopic) {
        nextProfileDetails.push(buildAskedFlowLine(pendingQuestionTopic));
    }

    return uniqueStrings(nextProfileDetails);
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

function normalizeRuntimeResult(executionResult, fallbackSessionId) {
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

    const userMessageEnglish = String(payload.userMessageEnglish ?? '').trim();
    const agentResponseEnglish = String(payload.agentResponseEnglish ?? '').trim();
    if (!userMessageEnglish || !agentResponseEnglish) {
        throw new Error('webCli orchestrator result must include English persistence fields.');
    }

    const sessionId = String(payload.sessionId ?? fallbackSessionId ?? '').trim();
    if (!sessionId) {
        throw new Error('webCli orchestrator result must include a sessionId.');
    }

    const flow = payload.flow;
    if (!flow || typeof flow !== 'object' || Array.isArray(flow)) {
        throw new Error('webCli orchestrator result must include a flow object.');
    }
    if (typeof flow.answeredPendingQuestion !== 'boolean') {
        throw new Error('webCli orchestrator flow must include answeredPendingQuestion as boolean.');
    }
    const pendingQuestionTopic = typeof flow.pendingQuestionTopic === 'string'
        ? flow.pendingQuestionTopic.trim()
        : '';

    return {
        success: payload.success !== false,
        sessionId,
        response,
        userMessageEnglish,
        agentResponseEnglish,
        profiles: uniqueStrings(payload.profiles),
        profileDetails: uniqueStrings(payload.profileDetails),
        flow: {
            answeredPendingQuestion: flow.answeredPendingQuestion,
            pendingQuestionTopic,
        },
        lead: payload.lead && typeof payload.lead === 'object'
            ? payload.lead
            : { shouldCreate: false },
        meeting: payload.meeting && typeof payload.meeting === 'object'
            ? payload.meeting
            : { shouldOffer: false },
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

            const normalized = normalizeRuntimeResult(execution, sessionId);
            const synthesizedProfileDetails = synthesizeProfileDetails({
                currentProfileDetails: context?.currentSessionState?.profileDetails,
                payloadProfileDetails: normalized.profileDetails,
                flow: normalized.flow,
            });

            const sessionResult = await updateSession({
                sessionId: normalized.sessionId,
                userMessage: normalized.userMessageEnglish,
                agentResponse: normalized.agentResponseEnglish,
                profiles: normalized.profiles,
                profileDetails: synthesizedProfileDetails,
            });

            return {
                success: normalized.success,
                sessionId: normalized.sessionId,
                response: normalized.response,
                profiles: normalized.profiles,
                profileDetails: synthesizedProfileDetails,
                lead: normalized.lead,
                meeting: normalized.meeting,
                session: sessionResult.session,
            };
        },
    };
}
