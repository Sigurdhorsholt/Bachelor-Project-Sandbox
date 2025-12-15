// components/MeetingLiveTestCard.tsx
import React, { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import {useGetMeetingQuery, useStartMeetingMutation} from "../Redux/meetingsApi";
import { meetingsApi } from "../Redux/meetingsApi";
import {useMeetingChannel} from "../realTime/useMeetingChannel.ts";

type Props = { meetingId?: string };

export default function MeetingLiveTestCard({ meetingId: propId }: Props) {
    const params = useParams();
    const meetingId = propId ?? (params.id as string);
    const dispatch = useDispatch();
    const [startMeeting] = useStartMeetingMutation();

    // Live SignalR subscription (attach/detach on mount/unmount)
    useMeetingChannel(meetingId);

    // RTK Query fetch (cached until invalidated/updated)
    const { data, isFetching, refetch } = useGetMeetingQuery(meetingId, {
        // never skip; we want cache to fill once and then be patched by SignalR
        // skip: !meetingId, // uncomment if your route can briefly have no id
    });


    const status = data?.started ?? 0;
    const title = data?.title ?? meetingId;

    const startViaEndpoint = useCallback(() => {
        startMeeting({ id: meetingId });
    }, [startMeeting, meetingId]);

    const prettyTime = useMemo(() => {
        const iso = (data as any)?.startedAtUtc ?? (data as any)?.startsAtUtc;
        if (!iso) return "–";
        try { return new Date(iso).toLocaleString(); } catch { return "–"; }
    }, [data]);

    return (
        <div className="p-4 rounded-2xl shadow border max-w-xl">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Live Test – {title}</h2>
                <button
                    onClick={refetch}
                    className="px-3 py-1.5 rounded border hover:bg-gray-50"
                    disabled={isFetching}
                >
                    {isFetching ? "Refreshing…" : "Refetch"}
                </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-gray-500">Meeting ID</div>
                    <div className="font-mono">{meetingId}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-gray-500">Status</div>
                    <div className="font-semibold">{status}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 col-span-2">
                    <div className="text-gray-500">Started At</div>
                    <div className="font-mono">{prettyTime}</div>
                </div>
            </div>

            <div className="mt-4 flex items-center gap-8">
                <button
                    onClick={startViaEndpoint}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:opacity-90 active:opacity-80"
                    title="Calls /api/meetings/{id}/start, server persists, then broadcasts via SignalR."
                >
                    Start Meeting (POST /start)
                </button>

                <div className="text-xs text-gray-500">
                    • Subscribed via SignalR<br />
                    • RTK Query cache updates on push
                </div>
            </div>
        </div>
    );
}
