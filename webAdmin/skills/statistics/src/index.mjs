import {
    getDataStore,
} from '../../../src/runtime/dataStore.mjs';
import { DATASTORE_TYPES, LEAD_FIELDS, LEAD_SECTIONS } from '../../../src/constants/datastore.mjs';

function parseTimestamp(value) {
    if (!value) {
        return null;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
}

function getIntervalStart(interval, referenceDate = new Date()) {
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
    return { start: startDate, end: endDate };
}

function isTimestampWithinWindow(timestamp, window) {
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
        return false;
    }
    return timestamp >= window.start.getTime() && timestamp <= window.end.getTime();
}

function parseInput(promptText) {
    let parsed;
    try {
        parsed = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('statistics expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('statistics input must be an object.');
    }
    return parsed;
}

export async function action({ promptText, referenceDate = new Date() }) {
    const store = getDataStore();
    const { interval } = parseInput(promptText);

    const sessionListing = await store.listFiles(DATASTORE_TYPES.SESSIONS);
    const window = getIntervalStart(interval, referenceDate);

    const sessionStats = await Promise.all(
        sessionListing.files.map((itemName) => store.getFileStats(DATASTORE_TYPES.SESSIONS, itemName))
    );
    const totalSessions = sessionStats.filter((entry) => isTimestampWithinWindow(entry.stats.mtimeMs, window)).length;

    let totalLeads = 0;
    const leadsByProfile = {};

    const leadListing = await store.listFiles(DATASTORE_TYPES.LEADS);
    for (const itemName of leadListing.files) {
        const lead = await store.getSectionMap(DATASTORE_TYPES.LEADS, itemName);
        const leadInfo = store.parseKeyValue(lead.sections[LEAD_SECTIONS.LEAD_INFO]);
        const stats = await store.getFileStats(DATASTORE_TYPES.LEADS, itemName);
        const createdAt = parseTimestamp(String(leadInfo[LEAD_FIELDS.CREATED_AT] ?? '').trim());
        const timestamp = createdAt !== null
            ? createdAt
            : ((stats.stats.birthtimeMs && stats.stats.birthtimeMs > 0) ? stats.stats.birthtimeMs : stats.stats.mtimeMs);
        if (!isTimestampWithinWindow(timestamp, window)) {
            continue;
        }

        totalLeads += 1;
        const profile = String(leadInfo[LEAD_FIELDS.PROFILE] ?? '').trim();
        if (profile) {
            leadsByProfile[profile] = (leadsByProfile[profile] || 0) + 1;
        }
    }

    return {
        success: true,
        stats: {
            interval,
            windowStart: window.start.toISOString(),
            windowEnd: window.end.toISOString(),
            totalSessions,
            totalLeads,
            leadsByProfile,
        },
    };
}
