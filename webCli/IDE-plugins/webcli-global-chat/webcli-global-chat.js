function normalizeString(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export class WebCliGlobalChat {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.hostContext = {};
        this.isOpen = false;
        this.boundEscapeHandler = this.handleEscapeKey.bind(this);
        this.invalidate();
    }

    beforeRender() {}

    afterRender() {
        this.bubbleButton = this.element.querySelector('#webCliChatBubble');
        this.panel = this.element.querySelector('#webCliChatPanel');
        this.iconImage = this.element.querySelector('.webcli-chat-bubble-icon-image');
        this.openAdminButton = this.element.querySelector('#openWebAdminChat');
        this.closeButton = this.element.querySelector('#closeWebCliChat');

        this.boundOpen = this.openChat.bind(this);
        this.boundClose = this.closeChat.bind(this);
        this.boundOpenAdmin = this.openWebAdminChat.bind(this);

        this.bubbleButton?.addEventListener('click', this.boundOpen);
        this.closeButton?.addEventListener('click', this.boundClose);
        this.openAdminButton?.addEventListener('click', this.boundOpenAdmin);
        window.addEventListener('keydown', this.boundEscapeHandler);

        this.syncButtonMetadata();
        this.syncPanelState();
    }

    afterUnload() {
        this.bubbleButton?.removeEventListener('click', this.boundOpen);
        this.closeButton?.removeEventListener('click', this.boundClose);
        this.openAdminButton?.removeEventListener('click', this.boundOpenAdmin);
        window.removeEventListener('keydown', this.boundEscapeHandler);
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
}
