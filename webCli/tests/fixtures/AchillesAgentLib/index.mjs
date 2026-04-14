function createFallbackLLM() {
    return {
        async executePrompt(promptText) {
            const text = String(promptText ?? '');

            if (text.includes('[WEBCLI_DECISION_PROMPT]')) {
                return {
                    response: 'Thanks for your message. I can help with your request.',
                    profiles: ['Developer.md'],
                    profileDetails: ['Testing session'],
                    lead: {
                        shouldCreate: false,
                        profile: '',
                        summary: '',
                        contactInfo: {},
                    },
                    meeting: {
                        shouldOffer: false,
                    },
                };
            }

            if (text.includes('[WEBCLI_FINAL_RESPONSE_PROMPT]')) {
                return 'Thanks for your message. I can help with your request.';
            }

            if (text.includes('[WEBCLI_HISTORY_TRANSLATION_PROMPT]')) {
                return {
                    userMessageEnglish: 'Test user message in English.',
                    agentResponseEnglish: 'Test agent response in English.',
                };
            }

            return 'ok';
        },
    };
}

export class RecursiveSkilledAgent {
    constructor({ llmAgent = null, logger = console } = {}) {
        this.llmAgent = llmAgent || createFallbackLLM();
        this.logger = logger;
        this._sessions = new Map();
    }

    getSessionMemory(sessionId = 'default') {
        if (!this._sessions.has(sessionId)) {
            this._sessions.set(sessionId, new Map());
        }
        return this._sessions.get(sessionId);
    }

    clearSessionMemory(sessionId = 'default') {
        this._sessions.set(sessionId, new Map());
    }

    shutdown() {
        this._sessions.clear();
    }
}

export default { RecursiveSkilledAgent };
