import * as SignalR from '@microsoft/signalr';

export function buildMeetingHub(
    getToken: () => string | undefined | Promise<string | undefined>,
    baseUrl = ''
): SignalR.HubConnection {
    // Prefer explicit baseUrl if provided; otherwise use VITE_API_URL if set, otherwise use relative URL.
    const envBase = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL as string | undefined) : undefined;
    const effectiveBase = baseUrl || envBase || '';
    const url = effectiveBase
        ? `${effectiveBase.replace(/\/$/, '')}/hub/meetings`
        : `/hub/meetings`;

    return new SignalR.HubConnectionBuilder()
        .withUrl(url, {
            accessTokenFactory: async () => {
                const t = await getToken();
                // Return empty string when no token — the hook will avoid starting when no token is present.
                return t ?? '';
            }
        })
        .withAutomaticReconnect()
        .configureLogging(SignalR.LogLevel.Information)
        .build();
}