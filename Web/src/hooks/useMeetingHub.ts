import { useEffect, useRef, useState, useCallback } from 'react';
import * as SignalR from '@microsoft/signalr';
import { buildMeetingHub } from '../services/signalr';

export type UseMeetingHubOptions = {
    baseUrl?: string;
    handlers?: Record<string, (...args: any[]) => void>;
    retryOnStart?: boolean;
};

type GetTokenFn = () => string | undefined | Promise<string | undefined>;

// Keep a simple, ergonomic signature: useMeetingHub(getToken, opts?)
export const useMeetingHub = (getToken: GetTokenFn, opts?: UseMeetingHubOptions) => {
    const connectionRef = useRef<SignalR.HubConnection | null>(null);
    const [connected, setConnected] = useState<boolean>(false);
    const [connectionError, setConnectionError] = useState<Error | null>(null);

    // lightweight message storage for simple UIs/tests
    const [receivedMessages, setReceivedMessages] = useState<any[]>([]);

    // Build and manage the SignalR connection
    useEffect(() => {
        let isMounted = true;
        const connection = buildMeetingHub(getToken, opts?.baseUrl ?? '');
        connectionRef.current = connection;

        const handleClose = (error?: Error) => {
            if (!isMounted) return;
            setConnected(false);
            if (error) setConnectionError(error);
        };
        const handleReconnecting = (error?: Error) => {
            if (!isMounted) return;
            setConnected(false);
            if (error) setConnectionError(error);
        };
        const handleReconnected = () => {
            if (!isMounted) return;
            setConnected(true);
            setConnectionError(null);
        };

        connection.onclose(handleClose);
        connection.onreconnecting(handleReconnecting);
        connection.onreconnected(handleReconnected);

        // register user-provided handlers immediately
        if (opts?.handlers) {
            for (const [event, handler] of Object.entries(opts.handlers)) {
                connection.on(event, handler);
            }
        }

        // simple default handler useful for quick testing
        const defaultReceive = (payload: any) => setReceivedMessages((prev) => [...prev, payload]);
        connection.on('ReceiveMessage', defaultReceive);

        // Start with a small retry loop while waiting for a token
        const startConnectionWithRetry = async () => {
            try {
                const token = await getToken();
                if (!token) {
                    if (opts?.retryOnStart ?? true) {
                        setConnectionError(new Error('No access token available yet'));
                        setTimeout(startConnectionWithRetry, 2000);
                    }
                    return;
                }

                await connection.start();
                if (!isMounted) return;
                setConnected(true);
                setConnectionError(null);
            } catch (err: any) {
                if (!isMounted) return;
                setConnected(false);
                setConnectionError(err instanceof Error ? err : new Error(String(err)));
                if (opts?.retryOnStart ?? true) {
                    setTimeout(startConnectionWithRetry, 2000);
                }
            }
        };

        startConnectionWithRetry();

        return () => {
            isMounted = false;
            try {
                connection.off('ReceiveMessage', defaultReceive);
                if (opts?.handlers) {
                    for (const [event, handler] of Object.entries(opts.handlers)) {
                        connection.off(event, handler);
                    }
                }
                connection.stop().catch(() => { /* ignore stop errors */ });
            } finally {
                connectionRef.current = null;
            }
        };
        // Recreate connection when token-getter or base URL changes
    }, [getToken, opts?.baseUrl]);

    const send = useCallback(async (method: string, ...args: any[]) => {
        const conn = connectionRef.current;
        if (!conn) throw new Error('SignalR connection not initialized');
        return conn.invoke(method, ...args);
    }, []);

    // subscribe to an event on the live connection; returns an unsubscribe function
    const subscribe = useCallback((event: string, handler: (...args: any[]) => void) => {
        const conn = connectionRef.current;
        if (!conn) throw new Error('SignalR connection not initialized');
        conn.on(event, handler);
        return () => conn.off(event, handler);
    }, []);

    return {
        connected,
        connectionError,
        receivedMessages,
        send,
        subscribe,
        connection: connectionRef.current,
    } as const;
};
