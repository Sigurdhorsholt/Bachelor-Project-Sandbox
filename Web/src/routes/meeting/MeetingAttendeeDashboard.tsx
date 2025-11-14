// routes/meeting/MeetingAttendeeDashboard.tsx
import React, {useEffect, useMemo} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Box, Card, CardContent, Chip, Divider, LinearProgress, Typography} from "@mui/material";
import {useMeetingChannel} from "../../realTime/useMeetingChannel.ts";
import {AgendaItemCard} from "../admin/components/shared/AgendaItemCard.tsx";
import TopBar from "../admin/components/TopBar.tsx";
import {clearAuth} from "../../Redux/auth/authSlice.ts";
import {useDispatch} from "react-redux";
import {clearAttendeeAuth} from "../../Redux/attendeeAuth/attendeeAuthSlice.ts";
import {useGetOpenVotationsByMeetingIdQuery} from "../../Redux/votationApi.ts";
import {useGetAgendaWithPropositionsQuery, useGetMeetingQuery} from "../../Redux/meetingsApi.ts";
import type {MeetingDto, MeetingStatusName} from "../../domain/meetings.ts";

/* ===================== Component ===================== */

export const MeetingAttendeeDashboard: React.FC = () => {
    console.log("Rendering MeetingAttendeeDashboard");
    const meetingId = useRouteMeetingId();
    useMeetingChannel(meetingId); // invalidates/refetches on push
    const dispatch = useDispatch();
    const navigate = useNavigate();

    //const {data: meetingData, isLoading: meetingIsLoading, isFetching: meetingIsFetching, isError: meetingIsError} = useGetMeetingFullQuery(meetingId, {
    //    skip: meetingId.length === 0,
    //});

    const {data: meetingData, isLoading: meetingIsLoading, isFetching: meetingIsFetching, isError: meetingIsError}  = useGetMeetingQuery(meetingId);
    const { data: agendaItems } = useGetAgendaWithPropositionsQuery(meetingId);




    const {data: votationData, isLoading: votationIsLoading, isFetching: votationIsFetching, isError: votationIsError} = useGetOpenVotationsByMeetingIdQuery(meetingId, {
        skip: meetingId.length === 0,
    });
    
    const hasStarted = useMemo(() => isMeetingStarted(meetingData), [meetingData]);
    const title = useMemo(() => getTitle(meetingIsLoading, meetingData), [meetingIsLoading, meetingData]);
    const headline = useMemo(() => getHeadline(meetingIsLoading, meetingIsError, hasStarted), [meetingIsLoading, meetingIsError, hasStarted]);
    const subline = useMemo(
        () => getSubline(meetingIsLoading, meetingIsError, hasStarted, meetingData?.startsAtUtc),
        [meetingIsLoading, meetingIsError, hasStarted, meetingData?.startsAtUtc]
    );

    const logout = () => {
        console.log("logging out as attendee")
        dispatch(clearAttendeeAuth());
        navigate("/");
    };
    
    useEffect(() => {
        console.log("votationData", votationData)
    }, [votationData]);


    return (
        <Box
            className="bg-gradient-to-b from-white to-slate-50"
            sx={{minHeight: "100vh", display: "grid", placeItems: "center", px: 2, py: {xs: 2, sm: 4}}}
        >
            <TopBar onMenuClick={() => {}} onLogout={logout} logoutButtonText={"Forlad Møde"}/>

         

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
                        {meetingIsError ? (
                            <Typography color="error">We couldn’t load this meeting.</Typography>
                        ) : meetingIsLoading ? (
                            <SkeletonAgenda/>
                        ) : agendaItems?.length ? (
                            agendaItems.map((item) => (
                                <AgendaItemCard key={item.id} meetingId={meetingId} agendaItem={item}/>
                            ))
                        ) : (
                            <Typography color="text.secondary" className="text-center">
                                No agenda items yet.
                            </Typography>
                        )}
                    </Box>
                </CardContent>
        </Box>
    );
};

/* ===================== Helpers ===================== */

const useRouteMeetingId = (): string => {
    const params = useParams<{ id: string }>();
    return typeof params?.id === "string" ? params.id : "";
};

const isMeetingStarted = (meeting?: MeetingDto | undefined): boolean => {
    if (!meeting) {
        return false;
    }
    if (meeting.started > 0) {
        return true;
    }
    if (meeting.status === "Published") {
        return true;
    }
    return false;
};

const getTitle = (isLoading: boolean, meeting?: MeetingDto): string => {
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
