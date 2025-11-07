import * as signalR from "@microsoft/signalr";
import type {HubConnection} from "@microsoft/signalr";

export const createMeetingHub = (token: string): HubConnection => {
    const conn = new signalR.HubConnectionBuilder()
        .withUrl("/hub/meetings", {
            accessTokenFactory: () => token,
            skipNegotiation: true,
            transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .build();
    
    return conn;
}