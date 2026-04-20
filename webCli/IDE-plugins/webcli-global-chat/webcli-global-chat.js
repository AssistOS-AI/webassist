function normalizeString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

const MCP_CLIENT_MODULE_URL = '/MCPBrowserClient.js';
const WEBCLI_MCP_ENDPOINT = '/mcps/webCli/mcp';
const WEBCLI_TOOL_NAME = 'web_cli_chat';
const WEBCLI_HISTORY_TOOL_NAME = 'web_cli_history';
const SESSION_STORAGE_KEY = 'webcli-global-chat:tabSessionId';

function tryParseJsonPayload(rawText) {
    if (typeof rawText !== 'string') {
        return null;
    }

    const trimmed = rawText.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        const firstBrace = trimmed.indexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace <= firstBrace) {
            return null;
        }
        try {
            const parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }
}

function extractToolText(result) {
    if (!result) {
        return '';
    }
    if (typeof result === 'string') {
        return result;
    }
    if (Array.isArray(result.content)) {
        return result.content
            .filter((entry) => entry && entry.type === 'text' && typeof entry.text === 'string')
            .map((entry) => entry.text)
            .join('\n')
            .trim();
    }
    if (typeof result.text === 'string') {
        return result.text;
    }
    try {
        return JSON.stringify(result, null, 2);
    } catch {
        return String(result);
    }
}

function sanitizeAgentText(rawText) {
    const text = normalizeString(rawText);
    if (!text) {
        return '';
    }

    const lines = text.split(/\r?\n/);
    const cleaned = [];

    for (const rawLine of lines) {
        const line = String(rawLine ?? '');
        const trimmed = line.trim();

        if (!trimmed) {
            continue;
        }
        if (/^Session ID:\s*/i.test(trimmed)) {
            continue;
        }
        if (/^Type\s+exit\s+to\s+leave\s*$/i.test(trimmed)) {
            continue;
        }
        if (/^you>\s*$/i.test(trimmed)) {
            continue;
        }

        const promptMatch = trimmed.match(/^you>\s*(.*)$/i);
        if (promptMatch) {
            const promptValue = normalizeString(promptMatch[1]);
            if (promptValue) {
                cleaned.push(promptValue);
            }
            continue;
        }

        cleaned.push(trimmed);
    }

    return cleaned.join('\n').trim();
}

function loadStoredSessionId() {
    try {
        const value = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    } catch {
        return '';
    }
}

function persistSessionId(sessionId) {
    try {
        if (typeof sessionId === 'string' && sessionId.trim()) {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId.trim());
            return;
        }
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
        // Ignore storage failures.
    }
}

export class WebCliGlobalChat {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.hostContext = {};
        this.isOpen = false;
        this.isPending = false;
        this.sessionId = loadStoredSessionId();
        this.mcpClient = null;
        this.mcpClientPromise = null;
        this.availableTools = null;
        this.hydratedHistorySessionId = '';
        this.pendingInitialHydration = false;
        this.boundEscapeHandler = this.handleEscapeKey.bind(this);
        this.invalidate(async () => {
            this.pendingInitialHydration = true;
            if (!this.messagesElement) {
                return;
            }
            this.pendingInitialHydration = false;
            await this.hydrateHistoryFromSession();
        });
    }

    beforeRender() {}

    afterRender() {
        this.bubbleButton = this.element.querySelector('#webCliChatBubble');
        this.panel = this.element.querySelector('#webCliChatPanel');
        this.subtitle = this.element.querySelector('#webCliChatSubtitle');
        this.messagesElement = this.element.querySelector('#webCliChatMessages');
        this.typingIndicator = this.element.querySelector('#webCliTypingIndicator');
        this.composer = this.element.querySelector('#webCliChatComposer');
        this.input = this.element.querySelector('#webCliChatInput');
        this.sendButton = this.element.querySelector('#webCliChatSend');
        this.iconImage = this.element.querySelector('.webcli-chat-bubble-icon-image');
        this.openAdminButton = this.element.querySelector('#openWebAdminChat');
        this.closeButton = this.element.querySelector('#closeWebCliChat');

        this.boundOpen = this.openChat.bind(this);
        this.boundClose = this.closeChat.bind(this);
        this.boundOpenAdmin = this.openWebAdminChat.bind(this);
        this.boundComposerSubmit = this.handleComposerSubmit.bind(this);
        this.boundInputChange = this.handleInputChange.bind(this);
        this.boundInputKeydown = this.handleInputKeydown.bind(this);

        this.bubbleButton?.addEventListener('click', this.boundOpen);
        this.closeButton?.addEventListener('click', this.boundClose);
        this.openAdminButton?.addEventListener('click', this.boundOpenAdmin);
        this.composer?.addEventListener('submit', this.boundComposerSubmit);
        this.input?.addEventListener('input', this.boundInputChange);
        this.input?.addEventListener('keydown', this.boundInputKeydown);
        window.addEventListener('keydown', this.boundEscapeHandler);

        this.syncButtonMetadata();
        this.updateSubtitle();
        this.setPending(false);
        this.hideTyping();
        this.syncPanelState();
        if (this.pendingInitialHydration) {
            this.pendingInitialHydration = false;
            void this.hydrateHistoryFromSession();
        }
    }

    afterUnload() {
        this.bubbleButton?.removeEventListener('click', this.boundOpen);
        this.closeButton?.removeEventListener('click', this.boundClose);
        this.openAdminButton?.removeEventListener('click', this.boundOpenAdmin);
        this.composer?.removeEventListener('submit', this.boundComposerSubmit);
        this.input?.removeEventListener('input', this.boundInputChange);
        this.input?.removeEventListener('keydown', this.boundInputKeydown);
        window.removeEventListener('keydown', this.boundEscapeHandler);
        if (this.mcpClient && typeof this.mcpClient.close === 'function') {
            this.mcpClient.close().catch(() => {
                // Ignore close failures.
            });
        }
    }

    updateHostContext(context = {}) {
        this.hostContext = context;
        this.syncButtonMetadata();
    }

    syncButtonMetadata() {
        const label = normalizeString(this.hostContext?.pluginLabel, this.element.getAttribute('data-plugin-label') || 'WebCli');
        const tooltip = normalizeString(this.hostContext?.pluginTooltip, this.element.getAttribute('data-plugin-tooltip') || label);
        const icon = normalizeString(this.hostContext?.pluginIcon, this.element.getAttribute('data-plugin-icon') || '');
        const labelElement = this.element.querySelector('.webcli-chat-bubble-label');

        if (labelElement) {
            labelElement.textContent = label;
        }
        if (this.bubbleButton) {
            this.bubbleButton.title = tooltip;
            this.bubbleButton.setAttribute('aria-label', tooltip);
        }
        if (this.iconImage && icon) {
            this.iconImage.src = icon;
        }
    }

    syncPanelState() {
        this.element.classList.toggle('is-open', this.isOpen);
        if (this.panel) {
            this.panel.setAttribute('aria-hidden', this.isOpen ? 'false' : 'true');
        }
        if (this.bubbleButton) {
            this.bubbleButton.setAttribute('aria-expanded', this.isOpen ? 'true' : 'false');
        }
        if (this.isOpen) {
            this.input?.focus();
        }
    }

    openChat() {
        this.isOpen = true;
        this.syncPanelState();
    }

    closeChat() {
        this.isOpen = false;
        this.syncPanelState();
    }

    openWebAdminChat() {
        window.open('/webchat?agent=webAdmin', '_blank', 'noopener');
    }

    handleEscapeKey(event) {
        if (event?.key === 'Escape' && this.isOpen) {
            this.closeChat();
        }
    }

    updateSubtitle() {
        if (!this.subtitle) {
            return;
        }
        if (this.sessionId) {
            this.subtitle.textContent = `Session ${this.sessionId}`;
            return;
        }
        this.subtitle.textContent = 'Context-aware website chat';
    }

    setPending(isPending) {
        this.isPending = Boolean(isPending);
        if (this.sendButton) {
            this.sendButton.disabled = this.isPending;
        }
        if (this.input) {
            this.input.disabled = this.isPending;
        }
    }

    showTyping() {
        if (!this.typingIndicator || !this.messagesElement) {
            return;
        }
        this.messagesElement.appendChild(this.typingIndicator);
        this.typingIndicator.classList.add('show');
        this.typingIndicator.setAttribute('aria-hidden', 'false');
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
    }

    hideTyping() {
        if (!this.typingIndicator) {
            return;
        }
        this.typingIndicator.classList.remove('show');
        this.typingIndicator.setAttribute('aria-hidden', 'true');
    }

    appendMessage(role, text) {
        if (!this.messagesElement) {
            return;
        }
        const wrapper = document.createElement('div');
        wrapper.className = `webcli-chat-message ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'webcli-chat-bubble-message';
        bubble.textContent = typeof text === 'string' ? text : String(text ?? '');

        wrapper.appendChild(bubble);
        this.messagesElement.appendChild(wrapper);
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
    }

    hasConversationMessages() {
        if (!this.messagesElement) {
            return false;
        }
        return this.messagesElement.querySelector('.webcli-chat-message:not(.webcli-chat-typing)') !== null;
    }

    async hydrateHistoryFromSession() {
        if (!this.sessionId || !this.messagesElement) {
            return;
        }
        if (this.hydratedHistorySessionId === this.sessionId) {
            return;
        }
        if (this.hasConversationMessages()) {
            this.hydratedHistorySessionId = this.sessionId;
            return;
        }

        this.setPending(true);
        try {
            const payload = await this.invokeHistory(this.sessionId);
            const historyItems = Array.isArray(payload.history) ? payload.history : [];
            for (const entry of historyItems) {
                const role = String(entry?.role ?? '').trim().toLowerCase() === 'user' ? 'user' : 'agent';
                const rawMessage = role === 'agent'
                    ? sanitizeAgentText(entry?.message)
                    : normalizeString(entry?.message);
                const message = normalizeString(rawMessage);
                if (!message) {
                    continue;
                }
                this.appendMessage(role, message);
            }
        } catch (error) {
            const messageText = error?.message || 'Failed to load history.';
            this.appendMessage('agent', `Error loading history: ${messageText}`);
        } finally {
            this.hydratedHistorySessionId = this.sessionId;
            this.setPending(false);
        }
    }

    handleInputChange() {
        if (!this.input) {
            return;
        }
        this.input.style.height = 'auto';
        const height = Math.min(this.input.scrollHeight, 180);
        this.input.style.height = `${height}px`;
    }

    handleInputKeydown(event) {
        if (!event || event.key !== 'Enter' || event.shiftKey || event.isComposing) {
            return;
        }
        event.preventDefault();
        void this.submitCurrentMessage();
    }

    async handleComposerSubmit(event) {
        event?.preventDefault?.();
        await this.submitCurrentMessage();
    }

    async submitCurrentMessage() {
        if (!this.input || this.isPending) {
            return;
        }
        const message = this.input.value.trim();
        if (!message) {
            return;
        }

        this.appendMessage('user', message);
        this.input.value = '';
        this.handleInputChange();

        this.setPending(true);
        this.showTyping();
        try {
            const result = await this.invokeWebCli(message);
            this.hideTyping();
            this.appendMessage('agent', result.responseText);
            if (result.sessionId) {
                this.sessionId = result.sessionId;
                persistSessionId(this.sessionId);
                this.updateSubtitle();
            }
            this.hydratedHistorySessionId = this.sessionId;
        } catch (error) {
            this.hideTyping();
            const messageText = error?.message || 'MCP request failed.';
            this.appendMessage('agent', `Error: ${messageText}`);
        } finally {
            this.setPending(false);
            this.input.focus();
        }
    }

    async ensureMcpClient() {
        if (this.mcpClient) {
            return this.mcpClient;
        }
        if (this.mcpClientPromise) {
            return this.mcpClientPromise;
        }
        this.mcpClientPromise = (async () => {
            const module = await import(MCP_CLIENT_MODULE_URL);
            if (!module || typeof module.createAgentClient !== 'function') {
                throw new Error('MCP browser client module is unavailable.');
            }
            this.mcpClient = module.createAgentClient(WEBCLI_MCP_ENDPOINT);
            return this.mcpClient;
        })();

        try {
            return await this.mcpClientPromise;
        } finally {
            this.mcpClientPromise = null;
        }
    }

    async ensureToolsCatalogLoaded(client) {
        if (!this.availableTools) {
            const tools = await client.listTools();
            this.availableTools = new Set(
                (Array.isArray(tools) ? tools : [])
                    .map((tool) => (tool && typeof tool.name === 'string' ? tool.name : ''))
                    .filter(Boolean)
            );
        }
    }

    async ensureNamedToolAvailable(client, toolName) {
        await this.ensureToolsCatalogLoaded(client);
        if (!this.availableTools || !this.availableTools.has(toolName)) {
            throw new Error(`MCP tool ${toolName} not found. Verify webCli/mcp-config.json.`);
        }
    }

    async invokeWebCli(message) {
        const client = await this.ensureMcpClient();
        await this.ensureNamedToolAvailable(client, WEBCLI_TOOL_NAME);

        const args = {
            message,
            json: true,
        };
        if (this.sessionId) {
            args.sessionId = this.sessionId;
        }

        const toolResult = await client.callTool(WEBCLI_TOOL_NAME, args);
        const toolText = extractToolText(toolResult);
        if (!toolText) {
            throw new Error('webCli MCP tool returned empty output.');
        }

        const parsed = tryParseJsonPayload(toolText);
        if (parsed && typeof parsed === 'object') {
            const responseText = sanitizeAgentText(parsed.message)
                || sanitizeAgentText(parsed.response)
                || sanitizeAgentText(toolText)
                || '(no output)';
            const sessionId = normalizeString(parsed.sessionId);
            return {
                responseText,
                sessionId,
            };
        }

        return {
            responseText: sanitizeAgentText(toolText) || '(no output)',
            sessionId: '',
        };
    }

    async invokeHistory(sessionId) {
        const normalizedSessionId = normalizeString(sessionId);
        if (!normalizedSessionId) {
            throw new Error('Missing sessionId for history loading.');
        }

        const client = await this.ensureMcpClient();
        await this.ensureNamedToolAvailable(client, WEBCLI_HISTORY_TOOL_NAME);

        const toolResult = await client.callTool(WEBCLI_HISTORY_TOOL_NAME, {
            sessionId: normalizedSessionId,
        });
        const toolText = extractToolText(toolResult);
        const parsed = tryParseJsonPayload(toolText);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid history payload returned by web_cli_history.');
        }
        return {
            sessionId: normalizeString(parsed.sessionId, normalizedSessionId),
            exists: parsed.exists === true,
            history: Array.isArray(parsed.history) ? parsed.history : [],
        };
    }
}
