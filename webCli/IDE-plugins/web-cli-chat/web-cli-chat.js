function normalizeString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

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
            const value = normalizeString(promptMatch[1]);
            if (value) {
                cleaned.push(value);
            }
            continue;
        }
        cleaned.push(trimmed);
    }

    return cleaned.join('\n').trim();
}

function loadSessionId(storageKey) {
    try {
        const value = window.sessionStorage.getItem(storageKey);
        return typeof value === 'string' && value.trim() ? value.trim() : '';
    } catch {
        return '';
    }
}

function persistSessionId(storageKey, sessionId) {
    try {
        if (typeof sessionId === 'string' && sessionId.trim()) {
            window.sessionStorage.setItem(storageKey, sessionId.trim());
            return;
        }
        window.sessionStorage.removeItem(storageKey);
    } catch {
        // Ignore storage failures.
    }
}

class WebCliMcpChatClient {
    constructor(options = {}) {
        this.clientModuleUrl = options.clientModuleUrl || '/MCPBrowserClient.js';
        this.endpoint = options.endpoint || '/mcps/webCli/mcp';
        this.chatToolName = options.chatToolName || 'web_cli_chat';
        this.historyToolName = options.historyToolName || 'web_cli_history';
        this.validateTools = options.validateTools === true;
        this.mcpClient = null;
        this.mcpClientPromise = null;
        this.availableTools = null;
    }

    async close() {
        if (this.mcpClient && typeof this.mcpClient.close === 'function') {
            await this.mcpClient.close();
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
            const module = await import(this.clientModuleUrl);
            if (!module || typeof module.createAgentClient !== 'function') {
                throw new Error('MCP browser client module is unavailable.');
            }
            this.mcpClient = module.createAgentClient(this.endpoint);
            return this.mcpClient;
        })();
        try {
            return await this.mcpClientPromise;
        } finally {
            this.mcpClientPromise = null;
        }
    }

    async ensureNamedToolAvailable(client, toolName) {
        if (!this.validateTools) {
            return;
        }
        if (!this.availableTools) {
            const tools = await client.listTools();
            this.availableTools = new Set(
                (Array.isArray(tools) ? tools : [])
                    .map((tool) => (tool && typeof tool.name === 'string' ? tool.name : ''))
                    .filter(Boolean)
            );
        }
        if (!this.availableTools.has(toolName)) {
            throw new Error(`MCP tool ${toolName} not found. Verify webCli/mcp-config.json.`);
        }
    }

    async invokeChat(message, sessionId = '') {
        const client = await this.ensureMcpClient();
        await this.ensureNamedToolAvailable(client, this.chatToolName);

        const args = { message, json: true };
        const normalizedSessionId = normalizeString(sessionId);
        if (normalizedSessionId) {
            args.sessionId = normalizedSessionId;
        }

        const toolResult = await client.callTool(this.chatToolName, args);
        const toolText = extractToolText(toolResult);
        if (!toolText) {
            throw new Error(`${this.chatToolName} MCP tool returned empty output.`);
        }

        const parsed = tryParseJsonPayload(toolText);
        if (parsed && typeof parsed === 'object') {
            const responseText = sanitizeAgentText(parsed.message)
                || sanitizeAgentText(parsed.response)
                || sanitizeAgentText(toolText)
                || '(no output)';
            return {
                responseText,
                sessionId: normalizeString(parsed.sessionId),
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
        await this.ensureNamedToolAvailable(client, this.historyToolName);

        const toolResult = await client.callTool(this.historyToolName, { sessionId: normalizedSessionId });
        const toolText = extractToolText(toolResult);
        const parsed = tryParseJsonPayload(toolText);
        if (!parsed || typeof parsed !== 'object') {
            throw new Error(`Invalid history payload returned by ${this.historyToolName}.`);
        }

        return {
            sessionId: normalizeString(parsed.sessionId, normalizedSessionId),
            history: Array.isArray(parsed.history) ? parsed.history : [],
        };
    }
}

function mountChatSurface(rootNode, options = {}) {
    const root = rootNode || document;
    const q = (selector) => root.querySelector(selector);

    const titleEl = q('#chatTitle');
    const subtitleEl = q('#chatSubtitle');
    const messagesEl = q('#chatMessages');
    const typingEl = q('#typing');
    const composerEl = q('#chatComposer');
    const inputEl = q('#chatInput');
    const sendEl = q('#chatSend');

    if (!titleEl || !subtitleEl || !messagesEl || !typingEl || !composerEl || !inputEl || !sendEl) {
        return () => {};
    }

    const query = options.query || new URLSearchParams(window.location.search);
    const storageKey = options.storageKey || 'webcli-global-chat:embedSessionId';
    const subtitleText = options.subtitleText || 'Embedded preview';
    const validateTools = options.validateTools === true;
    const chatClient = new WebCliMcpChatClient({ validateTools });

    const theme = query.get('theme') === 'dark' ? 'dark' : 'light';
    const headerText = normalizeString(query.get('headerText'), 'WebCli Assistant');
    const chatBackground = normalizeString(query.get('chatBackground'), theme === 'dark' ? '#0f172a' : '#f2f7ff');
    const userBubble = normalizeString(query.get('userBubble'), theme === 'dark' ? '#334155' : '#1e293b');
    const agentBubble = normalizeString(query.get('agentBubble'), theme === 'dark' ? '#1f2937' : '#f8fbff');
    const headerColor = normalizeString(query.get('headerColor'), theme === 'dark' ? '#111827' : '#0f172a');

    const styleRoot = root === document ? document.documentElement : root;
    styleRoot.style.setProperty('--chat-bg', chatBackground);
    styleRoot.style.setProperty('--chat-user', userBubble);
    styleRoot.style.setProperty('--chat-agent', agentBubble);
    styleRoot.style.setProperty('--chat-header', headerColor);

    titleEl.textContent = headerText;
    subtitleEl.textContent = subtitleText;

    let isPending = false;
    let sessionId = loadSessionId(storageKey);
    let hydratedHistorySessionId = '';

    function appendMessage(role, text) {
        const wrapper = document.createElement('div');
        wrapper.className = `chat-message ${role}`;
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = typeof text === 'string' ? text : String(text ?? '');
        wrapper.appendChild(bubble);
        messagesEl.appendChild(wrapper);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hasConversationMessages() {
        return messagesEl.querySelector('.chat-message:not(.chat-typing)') !== null;
    }

    function showTyping() {
        messagesEl.appendChild(typingEl);
        typingEl.classList.add('show');
        typingEl.setAttribute('aria-hidden', 'false');
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
        typingEl.classList.remove('show');
        typingEl.setAttribute('aria-hidden', 'true');
    }

    function setPending(next) {
        isPending = Boolean(next);
        sendEl.disabled = isPending;
        inputEl.disabled = isPending;
    }

    function resizeInput() {
        inputEl.style.height = 'auto';
        const height = Math.min(inputEl.scrollHeight, 160);
        inputEl.style.height = `${height}px`;
    }

    async function hydrateHistoryFromSession() {
        if (!sessionId) {
            return;
        }
        if (hydratedHistorySessionId === sessionId) {
            return;
        }
        if (hasConversationMessages()) {
            hydratedHistorySessionId = sessionId;
            return;
        }

        setPending(true);
        try {
            const payload = await chatClient.invokeHistory(sessionId);
            const nextSessionId = normalizeString(payload.sessionId, sessionId);
            sessionId = nextSessionId;
            persistSessionId(storageKey, sessionId);

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
                appendMessage(role, message);
            }
        } catch (error) {
            appendMessage('agent', `Error loading history: ${error?.message || 'Failed to load history.'}`);
        } finally {
            hydratedHistorySessionId = sessionId;
            setPending(false);
        }
    }

    const onInput = () => resizeInput();
    const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            composerEl.requestSubmit();
        }
    };
    const onSubmit = async (event) => {
        event.preventDefault();
        if (isPending) {
            return;
        }

        const message = normalizeString(inputEl.value);
        if (!message) {
            return;
        }

        appendMessage('user', message);
        inputEl.value = '';
        resizeInput();

        setPending(true);
        showTyping();
        try {
            const result = await chatClient.invokeChat(message, sessionId);
            hideTyping();
            appendMessage('agent', result.responseText);
            if (result.sessionId) {
                sessionId = result.sessionId;
                persistSessionId(storageKey, sessionId);
            }
        } catch (error) {
            hideTyping();
            appendMessage('agent', `Error: ${error?.message || 'MCP request failed.'}`);
        } finally {
            setPending(false);
            inputEl.focus();
        }
    };
    const onBeforeUnload = () => {
        void chatClient.close();
    };

    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onKeyDown);
    composerEl.addEventListener('submit', onSubmit);
    window.addEventListener('beforeunload', onBeforeUnload);
    void hydrateHistoryFromSession();

    return () => {
        inputEl.removeEventListener('input', onInput);
        inputEl.removeEventListener('keydown', onKeyDown);
        composerEl.removeEventListener('submit', onSubmit);
        window.removeEventListener('beforeunload', onBeforeUnload);
        void chatClient.close();
    };
}

export class WebCliChat {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.cleanup = null;
    }

    beforeRender() {}

    afterRender() {
        this.cleanup?.();
        this.cleanup = mountChatSurface(this.element, {
            subtitleText: 'Context-aware website chat',
            storageKey: 'webcli-global-chat:tabSessionId',
            validateTools: true,
        });
    }

    afterUnload() {
        this.cleanup?.();
        this.cleanup = null;
    }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.getElementById('chatMessages')) {
        mountChatSurface(document, {
            subtitleText: 'Embedded preview',
            storageKey: 'webcli-global-chat:embedSessionId',
            validateTools: false,
        });
    }
}
