const DEFAULTS = Object.freeze({
    theme: 'light',
    baseUrl: 'http://localhost:8080',
    headerText: 'WebCli Assistant',
    chatBackgroundLight: '#f2f7ff',
    chatBackgroundDark: '#0f172a',
    userBubbleLight: '#1e293b',
    userBubbleDark: '#334155',
    agentBubbleLight: '#f8fbff',
    agentBubbleDark: '#1f2937',
    headerLight: '#0f172a',
    headerDark: '#111827'
});

function normalizeString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeHex(value, fallback) {
    const normalized = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback;
}

function buildThemeDefaults(theme) {
    const dark = theme === 'dark';
    return {
        chatBackground: dark ? DEFAULTS.chatBackgroundDark : DEFAULTS.chatBackgroundLight,
        userBubble: dark ? DEFAULTS.userBubbleDark : DEFAULTS.userBubbleLight,
        agentBubble: dark ? DEFAULTS.agentBubbleDark : DEFAULTS.agentBubbleLight,
        headerColor: dark ? DEFAULTS.headerDark : DEFAULTS.headerLight
    };
}

function normalizeBaseUrl(value) {
    const raw = normalizeString(value);
    if (!raw) {
        return '';
    }

    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const parsed = new URL(withProtocol);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return '';
        }
        return parsed.origin;
    } catch {
        return '';
    }
}

function toQuery(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return;
        }
        const text = String(value);
        if (!text) {
            return;
        }
        query.set(key, text);
    });
    return query.toString();
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function buildIframeCode(src) {
    const safeSrc = escapeAttribute(src);
    return `<iframe src="${safeSrc}" title="WebCli Chat" loading="lazy" style="width:100%;max-width:420px;height:640px;border:0;border-radius:16px;overflow:hidden" allow="clipboard-write"></iframe>`;
}

export class WebcliSettingsSettings {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.props = element?.props || element?._componentProxy?.props || {};
        this.state = {
            baseUrl: DEFAULTS.baseUrl,
            theme: DEFAULTS.theme,
            headerText: DEFAULTS.headerText,
            chatBackground: DEFAULTS.chatBackgroundLight,
            userBubble: DEFAULTS.userBubbleLight,
            agentBubble: DEFAULTS.agentBubbleLight,
            headerColor: DEFAULTS.headerLight,
            status: '',
            statusType: ''
        };
        this.invalidate();
    }

    beforeRender() {}

    afterRender() {
        this.cacheElements();
        this.bindEvents();
        this.syncInputsFromState();
        this.renderDerived();
    }

    cacheElements() {
        this.baseUrlInput = this.element.querySelector('#webcliBaseUrl');
        this.themeInput = this.element.querySelector('#webcliTheme');
        this.headerTextInput = this.element.querySelector('#webcliHeaderText');
        this.chatBackgroundInput = this.element.querySelector('#webcliChatBackground');
        this.userBubbleInput = this.element.querySelector('#webcliUserBubble');
        this.agentBubbleInput = this.element.querySelector('#webcliAgentBubble');
        this.headerColorInput = this.element.querySelector('#webcliHeaderColor');
        this.previewButton = this.element.querySelector('#webcliPreviewButton');
        this.copyButton = this.element.querySelector('#webcliCopyButton');
        this.snippetArea = this.element.querySelector('#webcliIframeSnippet');
        this.statusElement = this.element.querySelector('#webcliSettingsStatus');
    }

    bindEvents() {
        if (this.element.dataset.webcliSettingsBound === 'true') {
            return;
        }
        this.element.dataset.webcliSettingsBound = 'true';

        this.baseUrlInput?.addEventListener('input', (event) => {
            this.state.baseUrl = String(event.target?.value || '');
            this.clearStatus();
            this.renderDerived();
        });

        this.themeInput?.addEventListener('change', (event) => {
            const nextTheme = String(event.target?.value || 'light') === 'dark' ? 'dark' : 'light';
            this.state.theme = nextTheme;
            const themeDefaults = buildThemeDefaults(nextTheme);
            this.state.chatBackground = themeDefaults.chatBackground;
            this.state.userBubble = themeDefaults.userBubble;
            this.state.agentBubble = themeDefaults.agentBubble;
            this.state.headerColor = themeDefaults.headerColor;
            this.syncInputsFromState();
            this.clearStatus();
            this.renderDerived();
        });

        this.headerTextInput?.addEventListener('input', (event) => {
            this.state.headerText = String(event.target?.value || '');
            this.clearStatus();
            this.renderDerived();
        });

        this.chatBackgroundInput?.addEventListener('input', (event) => {
            this.state.chatBackground = normalizeHex(event.target?.value, this.state.chatBackground);
            this.clearStatus();
            this.renderDerived();
        });

        this.userBubbleInput?.addEventListener('input', (event) => {
            this.state.userBubble = normalizeHex(event.target?.value, this.state.userBubble);
            this.clearStatus();
            this.renderDerived();
        });

        this.agentBubbleInput?.addEventListener('input', (event) => {
            this.state.agentBubble = normalizeHex(event.target?.value, this.state.agentBubble);
            this.clearStatus();
            this.renderDerived();
        });

        this.headerColorInput?.addEventListener('input', (event) => {
            this.state.headerColor = normalizeHex(event.target?.value, this.state.headerColor);
            this.clearStatus();
            this.renderDerived();
        });
    }

    syncInputsFromState() {
        if (this.baseUrlInput) {
            this.baseUrlInput.value = this.state.baseUrl;
        }
        if (this.themeInput) {
            this.themeInput.value = this.state.theme;
        }
        if (this.headerTextInput) {
            this.headerTextInput.value = this.state.headerText;
        }
        if (this.chatBackgroundInput) {
            this.chatBackgroundInput.value = this.state.chatBackground;
        }
        if (this.userBubbleInput) {
            this.userBubbleInput.value = this.state.userBubble;
        }
        if (this.agentBubbleInput) {
            this.agentBubbleInput.value = this.state.agentBubble;
        }
        if (this.headerColorInput) {
            this.headerColorInput.value = this.state.headerColor;
        }
    }

    getNormalizedBaseUrl() {
        return normalizeBaseUrl(this.state.baseUrl);
    }

    buildEmbedUrl() {
        const baseUrl = this.getNormalizedBaseUrl();
        if (!baseUrl) {
            return '';
        }

        const params = {
            theme: this.state.theme,
            headerText: normalizeString(this.state.headerText, DEFAULTS.headerText),
            chatBackground: normalizeHex(this.state.chatBackground, buildThemeDefaults(this.state.theme).chatBackground),
            userBubble: normalizeHex(this.state.userBubble, buildThemeDefaults(this.state.theme).userBubble),
            agentBubble: normalizeHex(this.state.agentBubble, buildThemeDefaults(this.state.theme).agentBubble),
            headerColor: normalizeHex(this.state.headerColor, buildThemeDefaults(this.state.theme).headerColor)
        };

        const query = toQuery(params);
        return `${baseUrl}/webCli/IDE-plugins/web-cli-chat/web-cli-chat.html?${query}`;
    }

    renderDerived() {
        const validBaseUrl = Boolean(this.getNormalizedBaseUrl());
        if (this.previewButton) {
            this.previewButton.disabled = !validBaseUrl;
        }
        if (this.copyButton) {
            this.copyButton.disabled = !validBaseUrl;
        }

        const embedUrl = this.buildEmbedUrl();
        if (this.snippetArea) {
            this.snippetArea.value = embedUrl ? buildIframeCode(embedUrl) : '';
        }

        this.renderStatus();
    }

    renderStatus() {
        if (!this.statusElement) {
            return;
        }
        this.statusElement.textContent = this.state.status || '';
        this.statusElement.classList.toggle('error', this.state.statusType === 'error');
    }

    clearStatus() {
        this.state.status = '';
        this.state.statusType = '';
    }

    openAdminWebchat() {
        const baseUrl = this.getNormalizedBaseUrl();
        if (!baseUrl) {
            this.state.status = 'Enter a valid Base URL first.';
            this.state.statusType = 'error';
            this.renderStatus();
            return;
        }
        window.open(`${baseUrl}/webchat?agent=webAdmin`, '_blank', 'noopener');
        this.state.status = 'Admin webchat opened in a new tab.';
        this.state.statusType = '';
        this.renderStatus();
    }

    openPreviewChat() {
        const embedUrl = this.buildEmbedUrl();
        if (!embedUrl) {
            this.state.status = 'Enter a valid Base URL first.';
            this.state.statusType = 'error';
            this.renderStatus();
            return;
        }
        window.open(embedUrl, '_blank', 'noopener');
        this.state.status = 'Preview opened in a new tab.';
        this.state.statusType = '';
        this.renderStatus();
    }

    async copyIframeCode() {
        const snippet = this.snippetArea?.value || '';
        if (!snippet) {
            this.state.status = 'Enter a valid Base URL first.';
            this.state.statusType = 'error';
            this.renderStatus();
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(snippet);
            } else {
                this.snippetArea?.focus();
                this.snippetArea?.select();
                document.execCommand('copy');
            }
            this.state.status = 'Iframe code copied to clipboard.';
            this.state.statusType = '';
            this.renderStatus();
        } catch {
            this.state.status = 'Failed to copy. Select snippet and copy manually.';
            this.state.statusType = 'error';
            this.renderStatus();
        }
    }

    closeModal() {
        assistOS.UI.closeModal(this.element, null);
    }
}

export class WebcliSettings {
    constructor(...args) {
        return new WebcliSettingsSettings(...args);
    }
}
