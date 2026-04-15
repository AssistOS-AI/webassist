import fs from 'node:fs/promises';
import path from 'node:path';

import { readMarkdownDirectory } from '../../../../webassist-shared/dataStore.mjs';

function parseInput(promptText) {
    if (promptText === undefined || promptText === null || String(promptText).trim() === '') {
        return {};
    }
    let parsed;
    try {
        parsed = JSON.parse(String(promptText));
    } catch {
        throw new Error('list-profiles expects promptText to be a valid JSON object.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('list-profiles input must be an object.');
    }
    return parsed;
}

function stripExtension(fileName) {
    return fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName;
}

const SECTION_HEADINGS = {
    characteristics: '## Characteristics',
    interests: '## Interests',
    qualifyingCriteria: '## Qualifying criteria',
};

function normalizeSectionLabels(sections) {
    if (!sections) {
        return { ok: true, labels: null };
    }
    if (!Array.isArray(sections)) {
        return { ok: false, error: 'sections must be an array of strings.' };
    }

    const labels = [];
    const seen = new Set();
    for (const entry of sections) {
        const normalized = typeof entry === 'string' ? entry.trim() : '';
        if (!normalized) {
            continue;
        }
        const key = normalized.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        labels.push(normalized);
    }

    return { ok: true, labels };
}

function resolveSectionKeys(sectionLabels) {
    if (!sectionLabels) {
        return null;
    }

    const resolved = new Set();
    const unknown = [];

    for (const label of sectionLabels) {
        const normalized = label.toLowerCase();
        if (normalized.includes('character')) {
            resolved.add('characteristics');
            continue;
        }
        if (normalized.includes('interest')) {
            resolved.add('interests');
            continue;
        }
        if (normalized.includes('criteria') || normalized.includes('qualify')) {
            resolved.add('qualifyingCriteria');
            continue;
        }
        unknown.push(label);
    }

    if (resolved.size === 0 && unknown.length > 0) {
        return Object.keys(SECTION_HEADINGS);
    }

    return Array.from(resolved);
}

function extractSection(content, heading) {
    const sectionPattern = new RegExp(
        `${heading}\\n([\\s\\S]*?)(?=\\n## |$)`,
        'i'
    );
    const match = content.match(sectionPattern);
    return match ? match[1].trim() : '';
}

function buildSectionOutput(content, sectionKeys) {
    const keys = sectionKeys ?? Object.keys(SECTION_HEADINGS);
    const sections = [];

    for (const key of keys) {
        const heading = SECTION_HEADINGS[key];
        if (!heading) {
            continue;
        }
        const sectionContent = extractSection(content, heading);
        sections.push({
            key,
            heading,
            content: sectionContent || '*None*',
        });
    }

    const rendered = sections
        .map((section) => `${section.heading}\n${section.content}`)
        .join('\n\n')
        .trim();

    return {
        rendered,
        displayed: sections.map((section) => section.heading.replace(/^##\s*/, '').trim()),
    };
}

async function findProfileByName(profilesDir, profileName) {
    const entries = await fs.readdir(profilesDir, { withFileTypes: true });
    const target = profileName.toLowerCase();

    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) {
            continue;
        }
        if (entry.name.toLowerCase() === `${target}.md` || entry.name.toLowerCase() === target) {
            return entry.name;
        }
    }

    return null;
}

export async function action({ promptText, dataDir = './data' }) {
    const { profileName, sections } = parseInput(promptText);

    const profilesDir = path.join(dataDir, 'profilesInfo');
    if (profileName) {
        let existingFile;
        try {
            existingFile = await findProfileByName(profilesDir, String(profileName).trim());
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                return { success: true, profiles: [] };
            }
            throw error;
        }

        if (!existingFile) {
            return { success: false, error: `Profile not found: ${profileName}` };
        }

        const profilePath = path.join(profilesDir, existingFile);
        const content = await fs.readFile(profilePath, 'utf8');
        const normalizedSections = normalizeSectionLabels(sections);
        if (!normalizedSections.ok) {
            return { success: false, error: normalizedSections.error };
        }

        if (!normalizedSections.labels) {
            return {
                success: true,
                profileName: stripExtension(existingFile),
                content: content.trim(),
                sectionsDisplayed: Object.values(SECTION_HEADINGS)
                    .map((heading) => heading.replace(/^##\s*/, '').trim()),
            };
        }

        const sectionKeys = resolveSectionKeys(normalizedSections.labels);
        const { rendered, displayed } = buildSectionOutput(content, sectionKeys);

        return {
            success: true,
            profileName: stripExtension(existingFile),
            content: rendered,
            sectionsDisplayed: displayed,
        };
    }

    const profileFiles = await readMarkdownDirectory(profilesDir);
    const profiles = profileFiles
        .map((file) => stripExtension(file.fileName))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));

    return {
        success: true,
        profiles,
    };
}
