import {useEffect, useMemo, useRef, useState} from "react";
import * as signalR from "@microsoft/signalr";

type UserDto = { connectionId: string; name: string };

export default function AppSignalRTestSetup() {
    const [name, setName] = useState("");
    const [me, setMe] = useState<UserDto | null>(null);
    const [users, setUsers] = useState<UserDto[]>([]);

    const connectionRef = useRef<signalR.HubConnection | null>(null);
    const lastNameRef = useRef<string | null>(null);
    const startedRef = useRef(false); // guard React StrictMode double-run

    const connection = useMemo(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl("/hub/presence", {
                transport: signalR.HttpTransportType.WebSockets, // <-- go WS directly
                skipNegotiation: true,                           // <-- avoid negotiate race
            })
            .withAutomaticReconnect()
            .build();
        connectionRef.current = conn;
        return conn;
    }, []);

    useEffect(() => {
        // Handlers
        connection.on("CurrentUsers", (list: UserDto[]) => setUsers(list));
        connection.on("UserJoined", (u: UserDto) => {
            setUsers(prev => (prev.some(x => x.connectionId === u.connectionId) ? prev : [...prev, u]));
            if (u.connectionId === connection.connectionId) setMe(u);
        });
        connection.on("UserLeft", (connectionId: string) => {
            setUsers(prev => prev.filter(u => u.connectionId !== connectionId));
            setMe(cur => (cur?.connectionId === connectionId ? null : cur));
        });

        // Auto re-join after reconnects
        connection.onreconnected(async () => {
            if (lastNameRef.current) {
                try {
                    await connection.invoke("Join", lastNameRef.current);
                } catch (err) {
                    console.error("Re-join failed:", err);
                }
            }
        });

        // Start once (guard StrictMode)
        const ensureStarted = async () => {
            if (startedRef.current) return;
            startedRef.current = true;
            if (connection.state === signalR.HubConnectionState.Disconnected) {
                await connection.start();
            }
        };
        ensureStarted().catch(e => {
            startedRef.current = false; // allow retry if it failed
            console.error(e);
        });

        // Best-effort graceful leave
        const handleBeforeUnload = () => {
            connection.invoke("Leave").catch(() => {
            });
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Don’t stop here in dev StrictMode to avoid “stopped during negotiation”.
            // If you really want to stop on unmount in prod, add a flag around this.
            // connection.stop();
        };
    }, [connection]);

    const join = async () => {
        const trimmed = name.trim();
        if (!trimmed) return;

        // Ensure connected before invoking
        if (connection.state !== signalR.HubConnectionState.Connected) {
            if (connection.state === signalR.HubConnectionState.Disconnected) {
                await connection.start().catch(console.error);
            }
        }
        lastNameRef.current = trimmed;
        await connection.invoke("Join", trimmed);
    };

    const leave = async () => {
        lastNameRef.current = null;
        setMe(null);
        try {
            await connection.invoke("Leave");
        } catch {
        }
    };

    return (
        <main style={{padding: 24, fontFamily: "system-ui, sans-serif"}}>
            <h1>SignalR Presence Sandbox yo</h1>

            {!me ? (
                    <div>
                        <input
                            placeholder="Your name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{padding: 8, marginRight: 8}}
                        />
                        <button onClick={join} style={{padding: 8}}>Join</button>
                    </div>
                ) :
                (
                    <div style={{marginBottom: 16}}>
                        <strong>You:</strong> {me.name} ({me.connectionId})
                        <button onClick={leave} style={{marginLeft: 12, padding: 6}}>Leave</button>
                    </div>
                )}


            <h2>Online now</h2>
            <ul>
                {users.map(u => (
                    <li key={u.connectionId}>
                        {u.name} <small style={{opacity: 0.6}}>({u.connectionId})</small>
                    </li>
                ))}
            </ul>
        </main>
    );
}
