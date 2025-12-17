import * as signalR from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";

export function createMeetingHub(token?: string): HubConnection
{
    const builder = new signalR.HubConnectionBuilder();
    
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