// realtime/meetinghub.ts
import * as signalR from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";

/**
 * Creates a HubConnection that talks to /hub/meetings.
 * Uses WebSockets only, with negotiation skipped for simplicity.
 */
export function createMeetingHub(token?: string): HubConnection
{
    const builder = new signalR.HubConnectionBuilder();

    // Only attach accessTokenFactory when a token is provided. This allows anonymous/public
    // clients to connect (they simply won't present a token). Admin clients should pass a token.
    const urlOptions: any = {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
    };

    if (token != null && token.length > 0) {
        urlOptions.accessTokenFactory = () => token;
    }

    const connection = builder
        .withUrl("/hub/meetings", urlOptions)
        .withAutomaticReconnect()
        .build();

    return connection;
}