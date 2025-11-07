// realtime/useMeetingChannel.ts
import { useEffect, useRef } from "react";
import type * as signalR from "@microsoft/signalr";
import { useDispatch, useSelector } from "react-redux";
import {getStoredAdminAccessToken} from "../services/token.ts";
import {meetingsApi} from "../Redux/meetingsApi.ts";
import {createMeetingHub} from "./meetinghub.ts";


type MeetingStateChangedDto = { meetingId: string; started: number; };
type MeetingStartedDto = { meetingId: string; };

export function useMeetingChannel(meetingId: string) {
    const token = getStoredAdminAccessToken();
    const connRef = useRef<signalR.HubConnection | null>(null);
    const dispatch = useDispatch();


    useEffect(() => {
        if (!token) return;

        const conn = createMeetingHub(token);
        connRef.current = conn;

        (async () => {
            await conn.start();
            await conn.invoke("JoinMeeting", meetingId);

            // --- typed server->client handlers (names must match IMeetingClient) ---
            conn.on("MeetingStateChanged", (dto: MeetingStateChangedDto) => {
                if (dto.meetingId !== meetingId) {
                    return
                };

                const started = dto.started;
                dispatch(meetingsApi.util.invalidateTags([{ type: "Meeting", id: meetingId }]));
                
             /*   // Patch getMeeting cache if present
                dispatch(
                    meetingsApi.util.updateQueryData("getMeeting", meetingId, (draft: any) => {
                        draft.status = started;
                    })
                );

                // Patch getMeetingFull cache if present
                dispatch(
                    meetingsApi.util.updateQueryData("getMeetingFull", meetingId, (draft: any) => {
                        draft.status = started;
                    })
                );*/
            });

            conn.on("MeetingStarted", (dto: MeetingStartedDto) => {
                if (dto.meetingId !== meetingId) {
                    return;
                }

                // We don't have a state number here → safest is to invalidate and let RTKQ refetch
                dispatch(meetingsApi.util.invalidateTags([{ type: "Meeting", id: meetingId }]));
                // If you *know* “started” == Published(=2), you could also patch:
                // const statusName = normalizeStatus(2);
                // dispatch(meetingsApi.util.updateQueryData("getMeeting", meetingId, d => { d.status = statusName; }));
                // dispatch(meetingsApi.util.updateQueryData("getMeetingFull", meetingId, d => { d.status = statusName; }));
            });

            // Optional dev hooks
            conn.on("Connected", () => {});
            conn.on("TickAck", () => {});
        })();

        return () => {
            (async () => {
                try { await conn.invoke("LeaveMeeting", meetingId); } finally { await conn.stop(); }
            })();
        };
    }, [meetingId, token, dispatch]);
}