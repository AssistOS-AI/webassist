import { updateSessionProfile } from '../../../src/runtime/update-session.mjs';

function parsePayload(promptText) {
    let payload;
    try {
        payload = JSON.parse(String(promptText ?? '{}'));
    } catch {
        throw new Error('Invalid JSON payload.');
    }

    if (!payload || typeof payload !== 'object') {
        throw new Error('Payload must be a JSON object.');
    }

    return payload;
}

export async function action({ promptText }) {
    const payload = parsePayload(promptText);

    const { sessionId, profiles, profileDetails, contactInformation } = payload || {};

    if (!sessionId) {
        throw new Error('Missing required field: sessionId.');
    }

    await updateSessionProfile({
        sessionId,
        profiles: Array.isArray(profiles) ? profiles : [],
        profileDetails: Array.isArray(profileDetails) ? profileDetails : [],
        contactInformation: contactInformation || {},
    });

    return {
        sessionId,
        updated: true,
    };
}
