
// components/MeetingHeader.tsx
// Fetches meeting data and displays title, status chip, headline, and subline.

import React, { useMemo } from "react";
import {
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    Skeleton,
    Typography,
    Alert,
    Paper,
    IconButton,
    Collapse
} from "@mui/material";
import { useGetMeetingQuery } from "../../../Redux/meetingsApi";
import type { MeetingDto } from "../../../domain/meetings";

type Props = {
    meetingId: string;
};

export const MeetingHeader: React.FC<Props> = ({ meetingId }) => {
    const { data: meeting, isLoading, isError } = useGetMeetingQuery(meetingId);

    const hasStarted = useMemo(() => isMeetingStarted(meeting), [meeting]);
    const title = useMemo(() => getTitle(isLoading, meeting), [isLoading, meeting]);
    const headline = useMemo(() => getHeadline(isLoading, isError, hasStarted), [isLoading, isError, hasStarted]);
    const subline = useMemo(
        () => getSubline(isLoading, isError, hasStarted, meeting?.startsAtUtc),
        [isLoading, isError, hasStarted, meeting?.startsAtUtc]
    );

    if (isError) {
        return (
            <Card className="rounded-2xl shadow-sm" sx={{ mb: 3 }}>
                <CardContent className="p-5 sm:p-8">
                    <Alert severity="error">
                        Der skete en fejl ved hentning af mødet. Prøv at genindlæse siden.
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="rounded-2xl shadow-sm" sx={{ mb: 3 }}>
                <CardContent className="p-5 sm:p-8">
                    <Box className="text-center space-y-3">
                        <Skeleton variant="rectangular" height={24} width="40%" sx={{ mx: "auto" }} />
                        <Skeleton variant="rectangular" height={40} width="80%" sx={{ mx: "auto" }} />
                        <Skeleton variant="rectangular" height={20} width="60%" sx={{ mx: "auto" }} />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-2xl shadow-sm" sx={{ mb: 3 }}>
            <CardContent className="p-5 sm:p-8">
                <Box className="text-center mb-3">
                    <Chip
                        label={hasStarted ? "Mødet er Live" : "Venter"}
                        color={hasStarted ? "success" : "default"}
                        variant="outlined"
                        size="medium"
                    />
                </Box>

                <Box className="text-center">
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                        {title}
                    </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box className="space-y-2 text-center">
                    <Typography variant="h6" fontWeight={700}>
                        {headline}
                    </Typography>
                    {subline && (
                        <Typography variant="body2" color="text.secondary">
                            {subline}
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

/* ===================== Helpers ===================== */

const isMeetingStarted = (meeting?: MeetingDto): boolean => {
    if (!meeting) return false;
    if (meeting.started > 0) return true;
    if (meeting.status === "Published") return true;
    return false;
};

const getTitle = (isLoading: boolean, meeting?: MeetingDto): string => {
    if (isLoading) return "Indlæser møde…";
    const t = meeting?.title?.trim();
    return t && t.length > 0 ? t : "Møde";
};

const getHeadline = (isLoading: boolean, isError: boolean, started: boolean): string => {
    if (isError) return "Der skete en fejl ved hentning af mødet.";
    if (isLoading) return "Du er logget ind.";
    if (started) return "Mødet er startet.";
    return "Du er logget ind. Vent på mødestyrer starter mødet.";
};

const getSubline = (
    isLoading: boolean,
    isError: boolean,
    started: boolean,
    startsAtUtc?: string | null
): string | null => {
    if (isError) return "Prøv at genindlæse siden eller vent et øjeblik.";
    if (isLoading) return "Vent venligst mens mødet indlæses...";
    if (started) return "Venter på at mødeleder starter den første afstemning.";
    const whenText = formatStartTime(startsAtUtc);
    return whenText ?? "Venter på mødestyrer starter mødet.";
};

const formatStartTime = (iso?: string | null): string | null => {
    if (!iso) return null;
    try {
        const dt = new Date(iso);
        const formatted = dt.toLocaleString("da-DK");
        return `Starter kl. ${formatted}`;
    } catch {
        return null;
    }
};
