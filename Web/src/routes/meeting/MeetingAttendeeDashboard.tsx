// routes/meeting/MeetingAttendeeDashboard.tsx
import React, {useMemo} from "react";
import {useParams} from "react-router-dom";
import {Box, Card, CardContent, Chip, Divider, LinearProgress, Typography} from "@mui/material";
import {useMeetingChannel} from "../../realTime/useMeetingChannel.ts";
import {useGetMeetingFullQuery} from "../../Redux/meetingsApi.ts";
import {AgendaItemCard} from "../admin/components/shared/AgendaItemCard.tsx";
import type {MeetingFullDto, MeetingStatusName} from "../../domain/meetings.ts";


/* ===================== Component ===================== */

export const MeetingAttendeeDashboard: React.FC = () => {
    const meetingId = useRouteMeetingId();
    useMeetingChannel(meetingId); // invalidates/refetches on push

    const {data, isLoading, isFetching, isError} = useGetMeetingFullQuery(meetingId, {
        skip: meetingId.length === 0,
    });

    const hasStarted = useMemo(() => isMeetingStarted(data), [data]);
    const title = useMemo(() => getTitle(isLoading, data), [isLoading, data]);
    const headline = useMemo(() => getHeadline(isLoading, isError, hasStarted), [isLoading, isError, hasStarted]);
    const subline = useMemo(
        () => getSubline(isLoading, isError, hasStarted, data?.startsAtUtc),
        [isLoading, isError, hasStarted, data?.startsAtUtc]
    );

    return (
        <Box
            className="bg-gradient-to-b from-white to-slate-50"
            sx={{minHeight: "100vh", display: "grid", placeItems: "center", px: 2, py: {xs: 2, sm: 4}}}
        >
            <Card elevation={1} className="rounded-2xl shadow-sm border border-slate-100 w-full max-w-2xl">
                {isFetching ? <LinearProgress/> : null}


                <Box className="text-center my-2">
                    <Chip
                        label={hasStarted ? "Mødet er Live" : "Waiting"}
                        color={hasStarted ? "success" : "default"}
                        variant="outlined"
                        size="small"
                    />
                </Box>

                <Divider className="my-6"/>

                <CardContent className="p-5 sm:p-8">
                    <Box className="text-center">
                        <Typography variant="h4" fontWeight={800} sx={{mt: 1}}>
                            {title}
                        </Typography>
                    </Box>

                    <Divider className="my-6"/>

                    <Box className="space-y-2 text-center mt-2">
                        <Typography variant="h6" fontWeight={800}>
                            {headline}
                        </Typography>
                        {subline ? (
                            <Typography variant="body1" color="text.secondary">
                                {subline}
                            </Typography>
                        ) : null}
                    </Box>

                    <Divider className="my-6"/>

                    {/* Agenda */}
                    <Box className="space-y-4">
                        {isError ? (
                            <Typography color="error">We couldn’t load this meeting.</Typography>
                        ) : isLoading ? (
                            <SkeletonAgenda/>
                        ) : data?.agenda?.length ? (
                            data.agenda.map((item) => (
                                <AgendaItemCard key={item.id} meetingId={meetingId} agendaItem={item}/>
                            ))
                        ) : (
                            <Typography color="text.secondary" className="text-center">
                                No agenda items yet.
                            </Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

/* ===================== Helpers ===================== */

const useRouteMeetingId = (): string => {
    const params = useParams<{ id: string }>();
    return typeof params?.id === "string" ? params.id : "";
};

const isMeetingStarted = (meeting?: MeetingFullDto | undefined): boolean => {
    if (!meeting) {
        return false;
    }
    if (typeof meeting.started === "number" && meeting.started > 0) {
        return true;
    }
    if (typeof meeting.status === "string") {
        const s = meeting.status as MeetingStatusName;
        if (s === "Published") {
            return true;
        }
    }
    return false;
};

const getTitle = (isLoading: boolean, meeting?: MeetingFullDto): string => {
    if (isLoading) {
        return "Loading meeting…";
    }
    const t = meeting?.title?.trim();
    return t && t.length > 0 ? t : "Meeting";
};

const getHeadline = (isLoading: boolean, isError: boolean, started: boolean): string => {
    if (isError) {
        return "Der skete en fejl ved hentning af mødet.";
    }
    if (isLoading) {
        return "Du er logget ind.";
    }
    if (started) {
        return "Mødet er startet.";
    }
    return "Du er logget ind. Vent på mødestyerer starter mødet.";
};

const getSubline = (
    isLoading: boolean,
    isError: boolean,
    started: boolean,
    startsAtUtc?: string | null
): string | null => {
    if (isError) {
        return "Please refresh the page or try again in a moment.";
    }
    if (isLoading) {
        return "Du er logget ind. Vent på mødestyerer starter mødet";
    }
    if (started) {
        return "Venter på at mødeleder starter den første afstemning";
    }
    const whenText = formatStartTime(startsAtUtc);
    return whenText ?? "Venter på mødestyerer starter mødet.";
};

const formatStartTime = (iso?: string | null): string | null => {
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
};

/* ===================== UI Skeleton ===================== */

const SkeletonAgenda: React.FC = () => {
    return (
        <Box className="space-y-4">
            {[0, 1].map((k) => (
                <Box key={k} className="animate-pulse space-y-3">
                    <Box className="h-6 bg-slate-200 rounded"/>
                    <Box className="h-4 bg-slate-200 rounded"/>
                    <Box className="h-16 bg-slate-200 rounded"/>
                </Box>
            ))}
        </Box>
    );
};

export default MeetingAttendeeDashboard;
