import fs from 'node:fs/promises';
import path from 'node:path';

const SESSION_HEADINGS = {
    profile: '### 1. Profile',
    details: '### 2. Profile Details',
    history: '### 3. History',
};

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function extractSection(content, heading) {
    const sectionPattern = new RegExp(
        `${escapeRegExp(heading)}\\n([\\s\\S]*?)(?=\\n### \\d+\\. |$)`,
        'm'
    );
    const match = content.match(sectionPattern);
    return match ? match[1].trim() : '';
}

function parseListSection(sectionText) {
    const trimmed = sectionText.trim();
    if (!trimmed || trimmed === '*None*') {
        return [];
    }

    return uniqueStrings(
        trimmed
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => line.replace(/^- /, '').trim())
    );
}

function renderListSection(items) {
    const values = uniqueStrings(items);
    return values.length > 0
        ? values.map((item) => `- ${item}`).join('\n')
        : '*None*';
}

function renderHistoryEntry(entry) {
    const role = entry.role === 'agent' ? 'Agent' : 'User';
    const messageLines = String(entry.message ?? '').split(/\r?\n/);
    const [firstLine = '', ...otherLines] = messageLines;

    if (otherLines.length === 0) {
        return `- **${role}**: ${firstLine}`;
    }

    const continuation = otherLines.map((line) => `  ${line}`).join('\n');
    return `- **${role}**: ${firstLine}\n${continuation}`;
}

function parseHistorySection(sectionText) {
    const trimmed = sectionText.trim();
    if (!trimmed || trimmed === '*None*') {
        return [];
    }

    const lines = trimmed.split(/\r?\n/);
    const history = [];
    let currentEntry = null;

    const flushCurrentEntry = () => {
        if (currentEntry) {
            history.push(currentEntry);
            currentEntry = null;
        }
    };

    for (const line of lines) {
        const entryMatch = line.match(/^- \*\*(User|Agent)\*\*: ?(.*)$/);
        if (entryMatch) {
            flushCurrentEntry();
            currentEntry = {
                role: entryMatch[1].toLowerCase(),
                message: entryMatch[2] ?? '',
            };
            continue;
        }

        if (!currentEntry) {
            continue;
        }

        if (line.startsWith('  ')) {
            currentEntry.message += `\n${line.slice(2)}`;
            continue;
        }

        currentEntry.message += `\n${line}`;
    }

    flushCurrentEntry();
    return history;
}

function normalizeObjectEntries(record) {
    return Object.fromEntries(
        Object.entries(record ?? {})
            .map(([key, value]) => [String(key).trim(), String(value ?? '').trim()])
            .filter(([key, value]) => key && value)
            .sort(([left], [right]) => left.localeCompare(right))
    );
}

export async function ensureDirectory(directoryPath) {
    await fs.mkdir(directoryPath, { recursive: true });
}

export function resolveDataDir(agentRoot, explicitDataDir = null) {
    return explicitDataDir
        ? path.resolve(explicitDataDir)
        : path.resolve(agentRoot, '..', 'webassist-shared', 'data');
}

export async function readMarkdownDirectory(directoryPath) {
    let directoryEntries;
    try {
        directoryEntries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }

    const markdownFiles = directoryEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

    return Promise.all(
        markdownFiles.map(async (fileName) => ({
            fileName,
            filePath: path.join(directoryPath, fileName),
            content: await fs.readFile(path.join(directoryPath, fileName), 'utf8'),
        }))
    );
}

export function combineMarkdownFiles(files, label) {
    if (!Array.isArray(files) || files.length === 0) {
        return '';
    }

    return files
        .map(({ fileName, content }) => `--- [${label}: ${fileName}] ---\n${content.trim()}`)
        .join('\n\n');
}

export function parseSessionMarkdown(content) {
    const source = String(content ?? '');
    const profilesText = extractSection(source, SESSION_HEADINGS.profile);
    const detailsText = extractSection(source, SESSION_HEADINGS.details);
    const historyText = extractSection(source, SESSION_HEADINGS.history);

    return {
        profiles: parseListSection(profilesText),
        profileDetails: parseListSection(detailsText),
        history: parseHistorySection(historyText),
        rawContent: source,
    };
}

export function renderSessionMarkdown({ profiles = [], profileDetails = [], history = [] }) {
    const historyText = history.length > 0
        ? history.map(renderHistoryEntry).join('\n')
        : '*None*';

    return [
        SESSION_HEADINGS.profile,
        renderListSection(profiles),
        '',
        SESSION_HEADINGS.details,
        renderListSection(profileDetails),
        '',
        SESSION_HEADINGS.history,
        historyText,
    ].join('\n');
}

export async function readSessionFile(sessionPath) {
    try {
        const content = await fs.readFile(sessionPath, 'utf8');
        return {
            exists: true,
            content,
            parsed: parseSessionMarkdown(content),
        };
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            return {
                exists: false,
                content: '',
                parsed: {
                    profiles: [],
                    profileDetails: [],
                    history: [],
                    rawContent: '',
                },
            };
        }
        throw error;
    }
}

export async function writeSessionFile(sessionPath, sessionRecord) {
    await ensureDirectory(path.dirname(sessionPath));
    const content = renderSessionMarkdown(sessionRecord);
    await fs.writeFile(sessionPath, `${content}\n`, 'utf8');
    return content;
}

export function createLeadFileName(sessionId) {
    return `${sessionId}-lead.md`;
}

export function normalizeLeadId(leadId) {
    return leadId.endsWith('.md') ? leadId : `${leadId}.md`;
}

function extractLeadField(content, fieldName) {
    const fieldPattern = new RegExp(`- \\*\\*${escapeRegExp(fieldName)}\\*\\*: ?(.+)$`, 'im');
    const match = content.match(fieldPattern);
    return match ? match[1].trim() : null;
}

export function parseLeadMarkdown(content) {
    const source = String(content ?? '');
    const contactInfoSection = extractSection(source, '### Contact Info');
    const summarySection = extractSection(source, '### Summary');
    const contactInfo = {};

    for (const line of contactInfoSection.split(/\r?\n/)) {
        const contactMatch = line.match(/^- \*\*(.+?)\*\*: ?(.*)$/);
        if (!contactMatch) {
            continue;
        }
        const key = contactMatch[1].trim();
        const value = contactMatch[2].trim();
        if (key && value) {
            contactInfo[key] = value;
        }
    }

    return {
        status: extractLeadField(source, 'Status'),
        profile: extractLeadField(source, 'Profile'),
        sessionId: extractLeadField(source, 'Session ID'),
        createdAt: extractLeadField(source, 'Created At'),
        updatedAt: extractLeadField(source, 'Updated At'),
        contactInfo,
        summary: summarySection.trim(),
        rawContent: source,
    };
}

export function renderLeadMarkdown({
    status = 'new',
    profile,
    sessionId,
    contactInfo = {},
    summary,
    createdAt,
    updatedAt,
}) {
    const normalizedContactInfo = normalizeObjectEntries(contactInfo);
    const contactLines = Object.entries(normalizedContactInfo).length > 0
        ? Object.entries(normalizedContactInfo)
            .map(([key, value]) => `- **${key}**: ${value}`)
            .join('\n')
        : '*None*';

    return [
        '### Lead Info',
        `- **Status**: ${status}`,
        `- **Profile**: ${profile}`,
        `- **Session ID**: ${sessionId}`,
        `- **Created At**: ${createdAt}`,
        `- **Updated At**: ${updatedAt}`,
        '',
        '### Contact Info',
        contactLines,
        '',
        '### Summary',
        String(summary ?? '').trim(),
    ].join('\n');
}

export async function readLeadFile(leadPath) {
    const content = await fs.readFile(leadPath, 'utf8');
    return {
        content,
        parsed: parseLeadMarkdown(content),
    };
}

export async function writeLeadFile(leadPath, leadRecord) {
    await ensureDirectory(path.dirname(leadPath));
    const content = renderLeadMarkdown(leadRecord);
    await fs.writeFile(leadPath, `${content}\n`, 'utf8');
    return content;
}

export function extractSessionIdFromLeadId(leadId, leadRecord = null) {
    if (leadRecord?.sessionId) {
        return leadRecord.sessionId;
    }

    const normalizedLeadId = normalizeLeadId(leadId);
    const match = normalizedLeadId.match(/^(.*)-lead(?:-[^.]+)?\.md$/);
    return match ? match[1] : null;
}

export async function listLeadRecords(leadsDirectoryPath) {
    const files = await readMarkdownDirectory(leadsDirectoryPath);
    return Promise.all(
        files.map(async (file) => {
            const stats = await fs.stat(file.filePath);
            return {
                ...file,
                stats,
                parsed: parseLeadMarkdown(file.content),
            };
        })
    );
}

export function parseTimestamp(value) {
    if (!value) {
        return null;
    }

    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
}

export function getLeadTimestamp(leadRecord) {
    const createdAt = parseTimestamp(leadRecord?.parsed?.createdAt);
    if (createdAt !== null) {
        return createdAt;
    }

    if (leadRecord?.stats?.birthtimeMs && leadRecord.stats.birthtimeMs > 0) {
        return leadRecord.stats.birthtimeMs;
    }

    return leadRecord?.stats?.mtimeMs ?? null;
}

export function getIntervalStart(interval, referenceDate = new Date()) {
    const endDate = referenceDate instanceof Date
        ? new Date(referenceDate.getTime())
        : new Date(referenceDate);

    if (Number.isNaN(endDate.getTime())) {
        throw new Error('referenceDate must be a valid date.');
    }

    const startDate = new Date(endDate.getTime());

    switch (interval) {
    case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
    case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
    case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    default:
        throw new Error(`Unsupported interval: ${interval}`);
    }

    return {
        start: startDate,
        end: endDate,
    };
}

export function isTimestampWithinWindow(timestamp, window) {
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
        return false;
    }

    return timestamp >= window.start.getTime() && timestamp <= window.end.getTime();
}

export function toIsoTimestamp(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error('Cannot convert invalid date to ISO timestamp.');
    }
    return date.toISOString();
}
