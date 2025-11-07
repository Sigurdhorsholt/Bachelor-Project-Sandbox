// SignalRProbeMini.tsx
import React, { useRef, useState } from "react";
import {
    HubConnection,
    HubConnectionBuilder,
    HubConnectionState,
    HttpTransportType,
    LogLevel,
} from "@microsoft/signalr";

type Props = {
    hubUrl?: string;              // e.g. "https://localhost:5076/hub/meeting" or "/hub/meeting"
    jwt?: string;                 // optional; if omitted we try localStorage.auth.accessToken
    subscribeTo?: string;         // optional server->client method to log, e.g. "Broadcast"
};

const SignalRProbeMini: React.FC<Props> = ({
                                               hubUrl = "/hub/meetings",
                                               jwt,
                                               subscribeTo = "Broadcast",
                                           }) => {
    const connRef = useRef<HubConnection | null>(null);
    const [state, setState] = useState<HubConnectionState>(HubConnectionState.Disconnected);

    // Try to pull a token from localStorage if not provided
    const getToken = () => {
        if (jwt) return jwt;
        try {
            const raw = localStorage.getItem("auth");
            if (!raw) return "";
            const parsed = JSON.parse(raw);
            return parsed?.accessToken || "";
        } catch {
            return "";
        }
    };

    const connect = async () => {
        if (connRef.current && connRef.current.state !== HubConnectionState.Disconnected) {
            console.log("[SignalR] Already connected or connecting. State:", HubConnectionState[connRef.current.state]);
            return;
        }

        const token = getToken();
        const redacted = token ? token.slice(0, 12) + "…<redacted>" : "<none>";

        console.log("[SignalR] Connecting…");
        console.log("[SignalR] Hub URL:", hubUrl);
        console.log("[SignalR] JWT (prefix):", redacted);

        const builder = new HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: token ? () => token : undefined,
                transport:
                    HttpTransportType.WebSockets |
                    HttpTransportType.ServerSentEvents |
                    HttpTransportType.LongPolling,
                // withCredentials: true, // uncomment for cookie auth
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000])
            .configureLogging(LogLevel.Trace); // dump internal client logs to console

        const conn = builder.build();

        // Lifecycle logging
        conn.onreconnecting((err) => {
            console.log("[SignalR] onreconnecting:", err?.message || err);
            setState(conn.state);
        });
        conn.onreconnected((connId) => {
            console.log("[SignalR] onreconnected. connectionId:", connId);
            setState(conn.state);
        });
        conn.onclose((err) => {
            console.log("[SignalR] onclose:", err?.message || "normal");
            setState(HubConnectionState.Disconnected);
            connRef.current = null;
        });

        // Optional: subscribe to a server->client method to see traffic
        if (subscribeTo) {
            conn.on(subscribeTo, (...args: any[]) => {
                try {
                    console.log(`[SignalR] << ${subscribeTo}`, args.length > 1 ? args : args[0]);
                } catch {
                    console.log(`[SignalR] << ${subscribeTo}`, args);
                }
            });
        }

        try {
            await conn.start();
            connRef.current = conn;
            setState(conn.state);

            // Try to print transport name + connectionId (not officially public API; best-effort)
            const transportName =
                (conn as any)?.connection?.transport?.constructor?.name ||
                (conn as any)?._connection?.transport?.constructor?.name ||
                "<unknown>";
            const connectionId = (conn as any)?.connectionId ?? (conn as any)?._connectionId ?? "<unknown>";

            console.log("[SignalR] Connected.");
            console.log("[SignalR] State:", HubConnectionState[conn.state]);
            console.log("[SignalR] Transport:", transportName);
            console.log("[SignalR] ConnectionId:", connectionId);
        } catch (e: any) {
            console.log("[SignalR] Connect failed:", e?.message || e);
            try { await conn.stop(); } catch {}
            connRef.current = null;
            setState(HubConnectionState.Disconnected);
        }
    };

    const disconnect = async () => {
        const c = connRef.current;
        if (!c) { console.log("[SignalR] No active connection."); return; }
        console.log("[SignalR] Stopping…");
        try {
            await c.stop();
            console.log("[SignalR] Stopped.");
        } catch (e: any) {
            console.log("[SignalR] Stop error:", e?.message || e);
        } finally {
            connRef.current = null;
            setState(HubConnectionState.Disconnected);
        }
    };

    // Calls a hub method named "Tick" with a simple payload
    const tick = async () => {
        const c = connRef.current;
        if (!c) return console.log("[SignalR] Tick aborted: not connected.");
        console.log("[SignalR] >> invoke Ping()");
        try {
            const result = await c.invoke("Ping");
            console.log("[SignalR] << Ping result:", result);
        } catch (e:any) {
            console.log("[SignalR] Ping error:", e?.message || e);
        }
    };

    return (
        <div style={{ display: "flex", gap: 8 }}>
            <button onClick={connect}>Connect</button>
            <button onClick={disconnect}>Disconnect</button>
            <button onClick={tick}>Tick</button>
            <span style={{ alignSelf: "center" }}>
        State: <b>{HubConnectionState[state]}</b>
      </span>
        </div>
    );
};

export default SignalRProbeMini;
