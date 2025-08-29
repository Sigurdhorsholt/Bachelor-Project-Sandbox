import { useEffect, useMemo, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

type UserDto = { connectionId: string; name: string };

export default function App() {
    const [name, setName] = useState("");
    const [me, setMe] = useState<UserDto | null>(null);
    const [users, setUsers] = useState<UserDto[]>([]);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    const connection = useMemo(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl("/hub/presence")
            .withAutomaticReconnect()
            .build();
        connectionRef.current = conn;
        return conn;
    }, []);

    useEffect(() => {
        // register handlers
        connection.on("CurrentUsers", (list: UserDto[]) => setUsers(list));
        connection.on("UserJoined", (u: UserDto) => {
            setUsers(prev => {
                const exists = prev.some(x => x.connectionId === u.connectionId);
                return exists ? prev : [...prev, u];
            });
            if (u.connectionId === connection.connectionId) setMe(u);
        });
        connection.on("UserLeft", (connectionId: string) => {
            setUsers(prev => prev.filter(u => u.connectionId !== connectionId));
            if (me?.connectionId === connectionId) setMe(null);
        });

        // start connection
        connection.start().catch(console.error);

        // graceful leave on tab close
        const handleBeforeUnload = () => {
            connection.invoke("Leave").catch(() => {});
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            connection.stop();
        };
    }, [connection]);

    const join = async () => {
        if (!name.trim()) return;
        await connection.invoke("Join", name.trim());
    };

    const leave = async () => {
        await connection.invoke("Leave");
    };

    return (
        <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
            <h1>SignalR Presence Sandbox</h1>

            {!me ? (
                <div>
                    <input
                        placeholder="Your name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ padding: 8, marginRight: 8 }}
                    />
                    <button onClick={join} style={{ padding: 8 }}>Join</button>
                </div>
            ) : (
                <div style={{ marginBottom: 16 }}>
                    <strong>You:</strong> {me.name} ({me.connectionId})
                    <button onClick={leave} style={{ marginLeft: 12, padding: 6 }}>Leave</button>
                </div>
            )}

            <h2>Online now</h2>
            <ul>
                {users.map(u => (
                    <li key={u.connectionId}>
                        {u.name} <small style={{ opacity: 0.6 }}>({u.connectionId})</small>
                    </li>
                ))}
            </ul>
        </main>
    );
}
