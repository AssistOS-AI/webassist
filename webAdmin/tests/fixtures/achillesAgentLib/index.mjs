export class RecursiveSkilledAgent {
    constructor({ llmAgent = null, logger = console } = {}) {
        this.llmAgent = llmAgent;
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
