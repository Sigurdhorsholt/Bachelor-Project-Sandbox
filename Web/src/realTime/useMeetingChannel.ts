import { useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";
import { useDispatch } from "react-redux";
import { meetingsApi } from "../Redux/meetingsApi";
import { votationApi } from "../Redux/votationApi";
import { createMeetingHub } from "./meetinghub";
import { getStoredAdminAccessToken } from "../services/token";

type PropositionOpenedDto = { meetingId: string; propositionId: string; votationId: string };
type VotationStoppedDto = { meetingId: string; propositionId: string; votationId: string; stoppedAtUtc: string };

export function useMeetingChannel(meetingId?: string, onStateChanged?: () => void): void
{
    const token = getStoredAdminAccessToken();
    const dispatch = useDispatch();

    const connectionRef = useRef<HubConnection | null>(null);
    const guardKeyRef = useRef<string | null>(null);
    const isStoppingRef = useRef<boolean>(false);

    useEffect(() =>
    {
     
        if (meetingId == null)
        {
            return;
        }
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


    function buildGuardKey(meetingId: string, token: string | undefined): string
    {
        return meetingId + "::" + (token ?? "<anon>");
    }

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
            }
        };

        run();
    }
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
    function cleanupConnection(connection: HubConnection, meetingId: string): void
    {
        const run = async () =>
        {
            await leaveMeetingGroup(connection, meetingId);
            await safeStop(connection);
        };

        run();
    }
    function registerServerHandlers(
        connection: HubConnection,
        meetingId: string,
        dispatch: any,
        onStateChanged?: () => void
    ): void
    {
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
        

        connection.on("PropositionVoteOpened", (dto: PropositionOpenedDto) => {
            console.debug("[useMeetingChannel] received PropositionVoteOpened", dto);
            if (dto == null) {
                return;
            }

            const dtoMeetingId = dto.meetingId ?? (dto as any).MeetingId;
            const dtoPropositionId = dto.propositionId ?? (dto as any).PropositionId;
            
            if (dtoMeetingId !== meetingId) {
                return;
            }
            
            // Invalidate both Meeting and Votations tags to refetch votations
            dispatch(meetingsApi.util.invalidateTags([
                { type: "Meeting", id: meetingId },
                { type: "Votations", id: dtoPropositionId }
            ]));
            // Also invalidate the votationApi cache for the same votations
            try {
                dispatch(votationApi.util.invalidateTags([
                    { type: "Votations", id: dtoPropositionId }
                ]));
            } catch {
                // ignore if votationApi not present or dispatch fails
            }
        });

        connection.on("PropositionVoteStopped", (dto: VotationStoppedDto) => {
            console.debug("[useMeetingChannel] received PropositionVoteStopped", dto);
            if (dto == null) {
                return;
            }

            const dtoMeetingId = dto.meetingId ?? (dto as any).MeetingId;
            const dtoPropositionId = dto.propositionId ?? (dto as any).PropositionId;
            
            if (dtoMeetingId !== meetingId) {
                return;
            }
            
            // Invalidate both Meeting and Votations tags to refetch votations
            dispatch(meetingsApi.util.invalidateTags([
                { type: "Meeting", id: meetingId },
                { type: "Votations", id: dtoPropositionId }
            ]));
            try {
                dispatch(votationApi.util.invalidateTags([
                    { type: "Votations", id: dtoPropositionId }
                ]));
            } catch {
                // ignore
            }
        });

        connection.on("VoteCast", (dto: any) => {
            console.debug("[useMeetingChannel] received VoteCast", dto);
            if (dto == null) {
                return;
            }

            const dtoMeetingId = dto.meetingId ?? (dto as any).MeetingId;
            const dtoPropositionId = dto.propositionId ?? (dto as any).PropositionId;
            const dtoVotationId = dto.votationId ?? (dto as any).VotationId;
            
            if (dtoMeetingId !== meetingId) {
                return;
            }
            
            // Invalidate votation tags to refetch vote results
            dispatch(meetingsApi.util.invalidateTags([
                { type: "Votations", id: dtoPropositionId },
                { type: "Votations", id: dtoVotationId }
            ]));
            try {
                dispatch(votationApi.util.invalidateTags([
                    { type: "Votations", id: dtoPropositionId },
                    { type: "Votations", id: dtoVotationId }
                ]));
            } catch {
                // ignore
            }
        });

        connection.on("VoteChanged", (dto: any) => {
            console.debug("[useMeetingChannel] received VoteChanged", dto);
            if (dto == null) {
                return;
            }

            const dtoMeetingId = dto.meetingId ?? (dto as any).MeetingId;
            const dtoPropositionId = dto.propositionId ?? (dto as any).PropositionId;
            const dtoVotationId = dto.votationId ?? (dto as any).VotationId;
            
            if (dtoMeetingId !== meetingId) {
                return;
            }
            
            // Invalidate votation tags to refetch vote results
            dispatch(meetingsApi.util.invalidateTags([
                { type: "Votations", id: dtoPropositionId },
                { type: "Votations", id: dtoVotationId }
            ]));
            try {
                dispatch(votationApi.util.invalidateTags([
                    { type: "Votations", id: dtoPropositionId },
                    { type: "Votations", id: dtoVotationId }
                ]));
            } catch {
                // ignore
            }
        });

        // Presence events: ParticipantJoined / ParticipantLeft
        connection.on("ParticipantJoined", (dto: any) => {
            console.debug("[useMeetingChannel] received ParticipantJoined", dto);
            if (dto == null) {
                return;
            }

            const dtoMeetingId = dto.meetingId ?? (dto as any).MeetingId;
            if (dtoMeetingId !== meetingId) {
                return;
            }

            // Invalidate the Meeting tag so UI (including admin view) refreshes participant info
            dispatch(meetingsApi.util.invalidateTags([{ type: "Meeting", id: meetingId }]));
        });

        connection.on("ParticipantLeft", (dto: any) => {
            console.debug("[useMeetingChannel] received ParticipantLeft", dto);
            if (dto == null) {
                return;
            }

            const dtoMeetingId = dto.meetingId ?? (dto as any).MeetingId;
            if (dtoMeetingId !== meetingId) {
                return;
            }

            // Invalidate the Meeting tag so UI (including admin view) refreshes participant info
            dispatch(meetingsApi.util.invalidateTags([{ type: "Meeting", id: meetingId }]));
        });
    }

}
