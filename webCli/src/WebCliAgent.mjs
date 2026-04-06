import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadAchillesAgentLib } from '../../shared/achillesLoader.mjs';
import { resolveDataDir } from '../../shared/dataStore.mjs';
import { executeJsonPrompt, executeTextPrompt } from '../../shared/llmAdapter.mjs';
import { handler as bookMeetingHandler, definition as bookMeetingDefinition } from '../skills/bookMeeting.mjs';
import { handler as createLeadHandler, definition as createLeadDefinition } from '../skills/createLead.mjs';
import { handler as respondRequestHandler, definition as respondRequestDefinition } from '../skills/respondRequest.mjs';
import { handler as updateSessionHandler, definition as updateSessionDefinition } from '../skills/updateSession.mjs';

const WEBCLI_DECISION_PROMPT = '[WEBCLI_DECISION_PROMPT]';
const WEBCLI_FINAL_RESPONSE_PROMPT = '[WEBCLI_FINAL_RESPONSE_PROMPT]';

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

function normalizeLeadDecision(leadDecision) {
    if (!leadDecision || typeof leadDecision !== 'object') {
        return {
            shouldCreate: false,
            profile: '',
            summary: '',
            contactInfo: {},
        };
    }

    return {
        shouldCreate: Boolean(leadDecision.shouldCreate),
        profile: String(leadDecision.profile ?? '').trim(),
        summary: String(leadDecision.summary ?? '').trim(),
        contactInfo: leadDecision.contactInfo && typeof leadDecision.contactInfo === 'object'
            ? leadDecision.contactInfo
            : {},
    };
}

function normalizeMeetingDecision(meetingDecision) {
    if (!meetingDecision || typeof meetingDecision !== 'object') {
        return { shouldOffer: false };
    }

    return {
        shouldOffer: Boolean(meetingDecision.shouldOffer),
    };
}

function normalizeDecision(decision) {
    if (!decision || typeof decision !== 'object') {
        throw new Error('webCli decision prompt must return a JSON object.');
    }

    const responseDraft = String(decision.response ?? '').trim();
    if (!responseDraft) {
        throw new Error('webCli decision prompt must provide a response draft.');
    }

    return {
        response: responseDraft,
        profiles: uniqueStrings(decision.profiles),
        profileDetails: uniqueStrings(decision.profileDetails),
        lead: normalizeLeadDecision(decision.lead),
        meeting: normalizeMeetingDecision(decision.meeting),
    };
}

function buildDecisionPrompt({ sessionId, userMessage, context }) {
    return `${WEBCLI_DECISION_PROMPT}
You are the webCli visitor assistant for a website.

Return JSON only with this shape:
{
  "response": "draft visitor-facing reply in the visitor language",
  "profiles": ["ProfileFile.md"],
  "profileDetails": ["English fact about the visitor"],
  "lead": {
    "shouldCreate": true,
    "profile": "ProfileName",
    "summary": "English summary of why this is a valuable lead",
    "contactInfo": { "email": "person@example.com", "name": "Jane Doe" }
  },
  "meeting": {
    "shouldOffer": false
  }
}

Rules:
- use profile filenames in "profiles";
- keep profileDetails and lead.summary in English;
- set lead.shouldCreate to true only when the visitor is valuable and contact information is present;
- set meeting.shouldOffer to true only when the visitor is highly qualified and explicitly asks to talk, meet, or book time with a human;
- when you need more information, the response should answer the current request and ask one strategic follow-up question.

Session ID: ${sessionId}
Visitor message:
${userMessage}

Site information:
${context.combinedSiteInfo}

Available profiles:
${context.combinedProfilesInfo}

Current session state:
${context.currentSessionStateText}`;
}

function buildFinalResponsePrompt({ userMessage, decision, meetingData }) {
    return `${WEBCLI_FINAL_RESPONSE_PROMPT}
Write the final visitor response in the same language as the visitor's last message.
Use the draft reply and the structured decision below.
Return plain text only.

Visitor message:
${userMessage}

Structured decision:
${JSON.stringify(decision, null, 2)}

Meeting data:
${meetingData ? meetingData.configData : 'No meeting data should be included.'}`;
}

function buildBaseAgentOptions({ agentRoot, llmAgent, logger, sessionConfig, recursiveAgentOptions }) {
    const baseOptions = {
        logger,
        startDir: agentRoot,
        searchUpwards: false,
        sessionConfig,
        ...(recursiveAgentOptions ?? {}),
    };

    if (llmAgent) {
        baseOptions.llmAgent = llmAgent;
    }

    return baseOptions;
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
    const achilles = await loadAchillesAgentLib(resolvedAgentRoot);

    class WebCliAgent extends achilles.RecursiveSkilledAgent {
        constructor() {
            super(buildBaseAgentOptions({
                agentRoot: resolvedAgentRoot,
                llmAgent,
                logger,
                sessionConfig,
                recursiveAgentOptions,
            }));

            this.agentRoot = resolvedAgentRoot;
            this.dataDir = resolveDataDir(resolvedAgentRoot, dataDir);
            this.skills = {
                updateSession: { definition: updateSessionDefinition, handler: updateSessionHandler },
                respondRequest: { definition: respondRequestDefinition, handler: respondRequestHandler },
                createLead: { definition: createLeadDefinition, handler: createLeadHandler },
                bookMeeting: { definition: bookMeetingDefinition, handler: bookMeetingHandler },
            };
            this.achilles = {
                libraryDir: achilles.libraryDir,
                entryPath: achilles.entryPath,
                libraryName: achilles.libraryName,
            };
        }

        async handleMessage({ sessionId, message, mode = 'fast' }) {
            if (!sessionId) {
                throw new Error('webCli.handleMessage requires a sessionId.');
            }
            if (!message) {
                throw new Error('webCli.handleMessage requires a message.');
            }

            const contextResult = await respondRequestHandler({ sessionId }, this.dataDir);
            const context = contextResult.context;
            const sessionMemory = typeof this.getSessionMemory === 'function'
                ? this.getSessionMemory(sessionId)
                : null;

            const decision = normalizeDecision(
                await executeJsonPrompt(
                    this.llmAgent,
                    buildDecisionPrompt({ sessionId, userMessage: message, context }),
                    { mode, sessionMemory }
                )
            );

            let leadResult = null;
            if (decision.lead.shouldCreate) {
                leadResult = await createLeadHandler({
                    sessionId,
                    contactInfo: decision.lead.contactInfo,
                    profile: decision.lead.profile,
                    summary: decision.lead.summary,
                }, this.dataDir);
            }

            let meetingResult = null;
            if (decision.meeting.shouldOffer) {
                meetingResult = await bookMeetingHandler({ sessionId }, this.dataDir);
                if (!meetingResult.success) {
                    throw new Error(meetingResult.error);
                }
            }

            const response = await executeTextPrompt(
                this.llmAgent,
                buildFinalResponsePrompt({
                    userMessage: message,
                    decision,
                    meetingData: meetingResult,
                }),
                { mode, sessionMemory }
            );

            const sessionResult = await updateSessionHandler({
                sessionId,
                userMessage: message,
                agentResponse: response,
                profiles: decision.profiles,
                profileDetails: decision.profileDetails,
            }, this.dataDir);

            return {
                success: true,
                sessionId,
                response,
                profiles: decision.profiles,
                profileDetails: decision.profileDetails,
                lead: leadResult
                    ? { shouldCreate: true, ...leadResult }
                    : { shouldCreate: false },
                meeting: meetingResult
                    ? { shouldOffer: true, ...meetingResult }
                    : { shouldOffer: false },
                session: sessionResult.session,
            };
        }
    }

    return new WebCliAgent();
}

export const promptKinds = {
    decision: WEBCLI_DECISION_PROMPT,
    finalResponse: WEBCLI_FINAL_RESPONSE_PROMPT,
};
