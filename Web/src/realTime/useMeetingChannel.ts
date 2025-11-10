// realtime/useMeetingChannel.ts
import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";
import { useDispatch } from "react-redux";
import { meetingsApi } from "../Redux/meetingsApi";
import { createMeetingHub } from "./meetinghub";
import { getStoredAdminAccessToken } from "../services/token";

/** ---- Server → Client DTOs ---- */
type MeetingStateChangedDto = { meetingId: string; started: number };
type MeetingStartedDto = { meetingId: string };
type PropositionOpenedDto = { meetingId: string; propositionId: string; votationId: string };
type VotationStoppedDto = { meetingId: string; propositionId: string; votationId: string; stoppedAtUtc: string };

/**
 * Subscribes UI to live updates for a specific meeting.
 * - Establishes a SignalR connection
 * - Joins a server group
 * - Auto-reconnects
 * - Updates RTK Query cache
 * - 100% StrictMode-safe
 *
 * Optional second parameter `onStateChanged` will be invoked when the server sends a
 * MeetingStateChanged/MeetingStarted event for this meeting. This allows non-RTK components
 * (e.g. the public MeetingDashboard) to refresh local state.
 */
export function useMeetingChannel(meetingId?: string, onStateChanged?: () => void): void
{
    const token = getStoredAdminAccessToken();
    const dispatch = useDispatch();

    const connectionRef = useRef<HubConnection | null>(null);
    const guardKeyRef = useRef<string | null>(null);
    const isStoppingRef = useRef<boolean>(false);

    useEffect(() =>
    {
        // If we don't have a meeting id yet, do nothing. We allow anonymous/public clients
        // (no admin token) to connect — they will simply not present an auth token.
        if (meetingId == null)
        {
            return;
        }

        // Narrow to a non-null string for inner helper calls
        const id = meetingId as string;

        // Use a stable guard key that includes whether we have a token or are anonymous so
        // React StrictMode double-mount detection still works.
        const guardKey = buildGuardKey(id, token ?? "<anon>");

        if (guardKeyRef.current === guardKey && connectionRef.current !== null)
        {
            return;
        }

        stopExistingConnection(connectionRef);

        const connection = createMeetingHub(token ?? undefined);
        connectionRef.current = connection;
        guardKeyRef.current = guardKey;
        isStoppingRef.current = false;

        registerServerHandlers(connection, id, dispatch, onStateChanged);

        connection.onreconnected(async () =>
        {
            await joinMeetingGroup(connection, id);
        });

        let effectWasCancelled = false;

        startAndJoin(connection, id, effectWasCancelled, isStoppingRef);

        return () =>
        {
            effectWasCancelled = true;
            isStoppingRef.current = true;

            if (guardKeyRef.current !== guardKey)
            {
                return;
            }

            const current = connectionRef.current;
            connectionRef.current = null;
            guardKeyRef.current = null;

            if (current === null)
            {
                return;
            }

            cleanupConnection(current, id);
        };

    }, [meetingId, token, dispatch, onStateChanged]);


    /** Builds a stable key used to detect React StrictMode double-mounts */
    function buildGuardKey(meetingId: string, token: string | undefined): string
    {
        return meetingId + "::" + (token ?? "<anon>");
    }

    /** Stops an old connection if it exists */
    function stopExistingConnection(ref: React.MutableRefObject<HubConnection | null>): void
    {
        const existing = ref.current;

        if (existing === null)
        {
            return;
        }

        const stopAsync = async () =>
        {
            try
            {
                await existing.stop();
            }
            catch
            {
                // ignore shutdown errors
            }
        };

        stopAsync();
        ref.current = null;
    }

    /** Starts the connection and joins the meeting group */
    function startAndJoin(
        connection: HubConnection,
        meetingId: string,
        effectWasCancelled: boolean,
        isStoppingRef: React.MutableRefObject<boolean>
    ): void
    {
        const run = async () =>
        {
            try
            {
                console.debug("[useMeetingChannel] starting connection for meeting:", meetingId, "tokenPresent:", !!(connection as any).accessTokenFactory);
                await connection.start();

                if (effectWasCancelled === true || isStoppingRef.current === true)
                {
                    await safeStop(connection);
                    return;
                }

                console.debug("[useMeetingChannel] connection started. joining meeting group:", meetingId);
                await joinMeetingGroup(connection, meetingId);
                console.debug("[useMeetingChannel] join requested for meeting:", meetingId);
            }
            catch
            {
                // ignore — likely unmounted or reconnecting
            }
        };

        run();
    }

    /** Safely join the server-side group */
    async function joinMeetingGroup(connection: HubConnection, meetingId: string): Promise<void>
    {
        if (connection.state !== signalR.HubConnectionState.Connected)
        {
            return;
        }

        try
        {
            await connection.invoke("JoinMeeting", meetingId);
        }
        catch
        {
            // ignore if reconnecting
        }
    }

    /** Safely leave the server-side group */
    async function leaveMeetingGroup(connection: HubConnection, meetingId: string): Promise<void>
    {
        if (connection.state !== signalR.HubConnectionState.Connected)
        {
            return;
        }

        try
        {
            await connection.invoke("LeaveMeeting", meetingId);
        }
        catch
        {
            // ignore
        }
    }

    /** Stops a connection safely */
    async function safeStop(connection: HubConnection): Promise<void>
    {
        try
        {
            await connection.stop();
        }
        catch
        {
            // ignore
        }
    }

    /** Full cleanup: leave group + stop connection */
    function cleanupConnection(connection: HubConnection, meetingId: string): void
    {
        const run = async () =>
        {
            await leaveMeetingGroup(connection, meetingId);
            await safeStop(connection);
        };

        run();
    }

    /** Handles server → client events */
    function registerServerHandlers(
        connection: HubConnection,
        meetingId: string,
        dispatch: any,
        onStateChanged?: () => void
    ): void
    {
        // Be tolerant to server-side DTO casing (camelCase vs PascalCase). Some servers
        // may serialize DTO properties as `MeetingId` while clients expect `meetingId`.
        connection.on("MeetingStateChanged", (dto: any) =>
        {
            console.debug("[useMeetingChannel] received MeetingStateChanged", dto);
            if (dto == null)
            {
                return;
            }

            const dtoMeetingId = dto.meetingId ?? dto.MeetingId ?? dto.meetingID ?? dto.MeetingID;

            if (dtoMeetingId !== meetingId)
            {
                return;
            }

            dispatch(meetingsApi.util.invalidateTags([{ type: "Meeting", id: meetingId }]));
            try {
                onStateChanged?.();
            }
            catch {
                // ignore errors from consumer callbacks
            }
        });

        connection.on("MeetingStarted", (dto: any) =>
        {
            console.debug("[useMeetingChannel] received MeetingStarted", dto);
            if (dto == null)
            {
                return;
            }

            const dtoMeetingId = dto.meetingId ?? dto.MeetingId ?? dto.meetingID ?? dto.MeetingID;

            if (dtoMeetingId !== meetingId)
            {
                return;
            }

            dispatch(meetingsApi.util.invalidateTags([{ type: "Meeting", id: meetingId }]));
            try {
                onStateChanged?.();
            }
            catch {
                // ignore
            }
        });
        

        connection.on("PropositionOpened", (dto: PropositionOpenedDto) => {
            if (dto.meetingId !== meetingId) {
                return;
            }
            // Option A: Just invalidate the meeting/votation-related caches
            dispatch(meetingsApi.util.invalidateTags([{ type: "Meeting", id: meetingId }]));
        });

        connection.on("VotationStopped", (dto: VotationStoppedDto) => {
            if (dto.meetingId !== meetingId) {
                return;
            }
            // Close the voting pane
            dispatch(meetingsApi.util.invalidateTags([{ type: "Meeting", id: meetingId }]));
        });
    }

}
