import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RecursiveSkilledAgent } from "achillesAgentLib";
import { readMarkdownDirectory, resolveDataDir } from '../../webassist-shared/dataStore.mjs';
import { executeJsonPrompt, executeTextPrompt } from './llmAdapter.mjs';

const WEBADMIN_CLASSIFY_PROMPT = '[WEBADMIN_CLASSIFY_PROMPT]';
const WEBADMIN_FINAL_RESPONSE_PROMPT = '[WEBADMIN_FINAL_RESPONSE_PROMPT]';

const ACTIONS = new Set(['news', 'statistics', 'leadInfo', 'updateLead']);

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

function normalizeClassification(classification) {
    if (!classification || typeof classification !== 'object') {
        throw new Error('webAdmin classification prompt must return a JSON object.');
    }

    const action = String(classification.action ?? '').trim();
    if (!ACTIONS.has(action)) {
        throw new Error(`Unsupported webAdmin action: ${action || '<empty>'}.`);
    }

    return {
        action,
        arguments: classification.arguments && typeof classification.arguments === 'object'
            ? classification.arguments
            : {},
    };
}

function buildClassificationPrompt({ message, availableLeadIds }) {
    return `${WEBADMIN_CLASSIFY_PROMPT}
You are the webAdmin owner assistant.

Choose exactly one action and return JSON only:
{
  "action": "news" | "statistics" | "leadInfo" | "updateLead",
  "arguments": { ... }
}

Allowed action arguments:
- news: { "limit": 5 }
- statistics: { "interval": "day" | "week" | "month" | "year" }
- leadInfo: { "leadId": "session-lead.md" }
- updateLead: { "leadId": "session-lead.md", "newStatus": "invalid" | "contacted" | "converted" }

Rules:
- default statistics interval to "month" when the owner asks for statistics without a window;
- default news limit to 5;
- use an existing leadId whenever the owner refers to a specific lead.

Known lead IDs:
${availableLeadIds.length > 0 ? availableLeadIds.join('\n') : 'No leads available yet.'}

Owner message:
${message}`;
}

function buildFinalResponsePrompt({ ownerMessage, action, actionResult }) {
    return `${WEBADMIN_FINAL_RESPONSE_PROMPT}
Write the final owner-facing response in the same language as the owner's last message.
Return plain text only.

Owner message:
${ownerMessage}

Executed action:
${action}

Structured result:
${JSON.stringify(actionResult, null, 2)}`;
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

    class WebAdminAgent extends RecursiveSkilledAgent {
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
            this.achilles = {
                libraryName: 'achillesAgentLib',
                source: 'node_modules',
            };
        }

        async executeCskill(skillName, input, { mode, sessionMemory, referenceDate } = {}) {
            const execution = await this.executeWithReviewMode(
                JSON.stringify(input),
                {
                    skillName,
                    model: mode,
                    context: {
                        sessionMemory,
                        dataDir: this.dataDir,
                        referenceDate,
                    },
                },
                'none'
            );

            return execution.result;
        }

        async handleMessage({ message, mode = 'fast', referenceDate = new Date() }) {
            if (!message) {
                throw new Error('webAdmin.handleMessage requires a message.');
            }

            const availableLeadIds = await listLeadIds(this.dataDir);
            const sessionMemory = typeof this.getSessionMemory === 'function'
                ? this.getSessionMemory('webadmin-owner')
                : null;
            const classification = normalizeClassification(
                await executeJsonPrompt(
                    this.llmAgent,
                    buildClassificationPrompt({ message, availableLeadIds }),
                    { mode, sessionMemory }
                )
            );

            let actionResult;
            switch (classification.action) {
            case 'news':
                actionResult = await this.executeCskill(
                    'news',
                    { limit: classification.arguments.limit ?? 5 },
                    { mode, sessionMemory, referenceDate }
                );
                break;
            case 'statistics':
                actionResult = await this.executeCskill(
                    'statistics',
                    { interval: classification.arguments.interval ?? 'month' },
                    { mode, sessionMemory, referenceDate }
                );
                break;
            case 'leadInfo':
                actionResult = await this.executeCskill(
                    'leadInfo',
                    { leadId: classification.arguments.leadId },
                    { mode, sessionMemory, referenceDate }
                );
                break;
            case 'updateLead':
                actionResult = await this.executeCskill(
                    'updateLead',
                    {
                        leadId: classification.arguments.leadId,
                        newStatus: classification.arguments.newStatus,
                    },
                    { mode, sessionMemory, referenceDate }
                );
                break;
            default:
                throw new Error(`Unsupported action: ${classification.action}`);
            }

            const response = await executeTextPrompt(
                this.llmAgent,
                buildFinalResponsePrompt({
                    ownerMessage: message,
                    action: classification.action,
                    actionResult,
                }),
                { mode, sessionMemory }
            );

            return {
                success: true,
                action: classification.action,
                arguments: classification.arguments,
                result: actionResult,
                response,
            };
        }
    }

    return new WebAdminAgent();
}

export const promptKinds = {
    classify: WEBADMIN_CLASSIFY_PROMPT,
    finalResponse: WEBADMIN_FINAL_RESPONSE_PROMPT,
};
