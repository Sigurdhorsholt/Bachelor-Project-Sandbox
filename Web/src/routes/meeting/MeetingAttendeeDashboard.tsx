// routes/meeting/MeetingAttendeeDashboard.tsx
import React, { type JSX, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Box, Card, CardContent, Chip, Divider, LinearProgress, Typography } from "@mui/material";
import {useMeetingChannel} from "../../realTime/useMeetingChannel.ts";
import { useGetMeetingPublicQuery } from "../../Redux/meetingsApi.ts";


// --- Types you expect back from the public meta endpoint ---
type PublicMeetingMeta = {
    id: string;
    title: string;
    startsAtUtc?: string | null;
    status?: string;   // "Draft" | "Scheduled" | "Published" | "Finished" | maybe "Live"
    started?: number;  // 0 or 1 – tolerate both shapes
    locationName?: string | null; // optional – show if you have it
};

// --- Component ---
export function MeetingAttendeeDashboard(): JSX.Element {
    const meetingId = getRouteMeetingId();
    useMeetingChannel(meetingId); // invalidates caches on push events

    console.log("MeetingAttendeeDashboard rendering for meetingId:", meetingId);
    
    const { data, isLoading, isError, isFetching } = useGetMeetingPublicQuery(meetingId, {
        skip: meetingId.length === 0,
    });

    const started = isMeetingStarted(data);
    const headline = getHeadline(isLoading, isError, started);
    const subline = getSubline(isLoading, isError, started, data);

    const when = useMemo(() => {
        return formatWhen(data?.startsAtUtc);
    }, [data?.startsAtUtc]);

    const place = useMemo(() => {
        return formatPlace(data?.locationName);
    }, [data?.locationName]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                px: 3,
                py: 4,
            }}
            className="bg-gradient-to-b from-white to-slate-50"
        >
            <Card
                elevation={1}
                className="rounded-2xl shadow-sm border border-slate-100 max-w-2xl w-full"
            >
                {isFetching ? <LinearProgress /> : null}

                <CardContent className="p-6 sm:p-8">
                    <Box className="text-center">
                        <Typography variant="overline" sx={{ letterSpacing: 1.2 }} color="text.secondary">
                            Attendee View
                        </Typography>

                        <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                            {getTitle(isLoading, data)}
                        </Typography>

                        <Box className="mt-3 flex items-center justify-center gap-2">
                            <Chip
                                label={started ? "Live" : "Waiting"}
                                color={started ? "success" : "default"}
                                variant="outlined"
                                size="small"
                            />
                            {meetingId ? (
                                <Typography variant="caption" color="text.secondary">
                                    Meeting ID: {meetingId}
                                </Typography>
                            ) : null}
                        </Box>

                        <Box className="mt-4 space-y-1">
                            {when ? (
                                <Typography variant="body2" color="text.secondary">
                                    {when}
                                </Typography>
                            ) : null}
                            {place ? (
                                <Typography variant="body2" color="text.secondary">
                                    {place}
                                </Typography>
                            ) : null}
                        </Box>

                        <Divider className="my-6" />

                        <Box className="space-y-2">
                            <Typography variant="h6" fontWeight={800}>
                                {headline}
                            </Typography>

                            {subline ? (
                                <Typography variant="body1" color="text.secondary">
                                    {subline}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

/* ===================== Helpers ===================== */

function getRouteMeetingId(): string {
    const params = useParams<{ id: string }>();
    if (params?.id && typeof params.id === "string") {
        return params.id;
    }
    return "";
}

function isMeetingStarted(meeting?: PublicMeetingMeta): boolean {
    if (!meeting) {
        return false;
    }

    if (typeof meeting.started === "number") {
        return meeting.started > 0;
    }

    if (typeof meeting.status === "string") {
        const s = meeting.status;
        if (s === "Published" || s === "Live" || s === "Started") {
            return true;
        }
    }

    return false;
}

function getHeadline(
    isLoading: boolean,
    isError: boolean,
    started: boolean
): string {
    if (isError) {
        return "We couldn’t load this meeting.";
    }

    if (isLoading) {
        return "You’re logged in.";
    }

    if (started) {
        return "Meeting is started.";
    }

    return "You’re logged in.";
}

function getSubline(
    isLoading: boolean,
    isError: boolean,
    started: boolean,
    meeting?: PublicMeetingMeta
): string | null {
    if (isError) {
        return "Please refresh the page or try again in a moment.";
    }

    if (isLoading) {
        return "Waiting for the meeting to start…";
    }

    if (started) {
        return "Waiting for the admin to open the first vote.";
    }

    const when = formatWhen(meeting?.startsAtUtc);
    if (when) {
        return `Waiting for the meeting to start. ${when}`;
    }

    return "Waiting for the meeting to start…";
}

function getTitle(isLoading: boolean, meeting?: PublicMeetingMeta): string {
    if (isLoading) {
        return "Loading meeting…";
    }

    if (meeting?.title && meeting.title.trim().length > 0) {
        return meeting.title.trim();
    }

    return "Meeting";
}

function formatWhen(iso?: string | null): string | null {
    if (!iso) {
        return null;
    }

    try {
        const dt = new Date(iso);
        const formatted = dt.toLocaleString();
        return `Starts at ${formatted}`;
    } catch {
        return null;
    }
}

function formatPlace(name?: string | null): string | null {
    if (!name) {
        return null;
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
        return null;
    }

    return trimmed;
}
