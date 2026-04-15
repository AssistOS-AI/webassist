function stripMarkdownFences(text) {
    const trimmed = text.trim();
    const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function looksLikeWrapperObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const keys = Object.keys(value);
    if (keys.length === 0) {
        return false;
    }

    const wrapperKeys = new Set(['result', 'response', 'content', 'data', 'output', 'value', 'message']);
    return keys.every((key) => wrapperKeys.has(key) || key === 'success');
}

function unwrapValue(value) {
    let currentValue = value;

    while (looksLikeWrapperObject(currentValue)) {
        const nextKey = ['result', 'response', 'content', 'data', 'output', 'value', 'message']
            .find((key) => key in currentValue);
        if (!nextKey) {
            break;
        }
        currentValue = currentValue[nextKey];
    }

    return currentValue;
}

function parseJsonFromString(text) {
    const normalized = stripMarkdownFences(text);
    return JSON.parse(normalized);
}

function normalizeTextResult(result) {
    const unwrapped = unwrapValue(result);
    if (typeof unwrapped === 'string') {
        return unwrapped.trim();
    }
    if (unwrapped === null || unwrapped === undefined) {
        return '';
    }
    if (typeof unwrapped === 'object') {
        return JSON.stringify(unwrapped);
    }
    return String(unwrapped);
}

function normalizeJsonResult(result) {
    const unwrapped = unwrapValue(result);
    if (typeof unwrapped === 'string') {
        return parseJsonFromString(unwrapped);
    }
    if (unwrapped && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
        return unwrapped;
    }

    throw new Error('The LLM did not return a JSON object.');
}

async function invokeLLM(llmAgent, promptText, options) {
    if (!llmAgent) {
        throw new Error('An llmAgent instance is required.');
    }

    if (typeof llmAgent.executePrompt === 'function') {
        return llmAgent.executePrompt(promptText, options);
    }

    if (typeof llmAgent.complete === 'function') {
        return llmAgent.complete({
            prompt: promptText,
            ...options,
        });
    }

    throw new Error('The provided llmAgent does not support executePrompt() or complete().');
}

export async function executeJsonPrompt(llmAgent, promptText, options = {}) {
    const result = await invokeLLM(llmAgent, promptText, {
        ...options,
        responseShape: 'json',
    });

    return normalizeJsonResult(result);
}

export async function executeTextPrompt(llmAgent, promptText, options = {}) {
    const result = await invokeLLM(llmAgent, promptText, {
        ...options,
        responseShape: 'text',
    });

    return normalizeTextResult(result);
}
