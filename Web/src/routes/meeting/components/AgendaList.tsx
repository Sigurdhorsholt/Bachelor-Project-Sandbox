// components/AgendaList.tsx
// Fetches agenda items with propositions and renders them.

import React from "react";
import { Box, Typography, Skeleton, Alert } from "@mui/material";
import { useGetAgendaWithPropositionsQuery } from "../../../Redux/meetingsApi";
import { AgendaItemCard } from "./AgendaItemCard";

type Props = {
    meetingId: string;
};

export const AgendaList: React.FC<Props> = ({ meetingId }) => {
    const { data: agendaItems, isLoading, isError } = useGetAgendaWithPropositionsQuery(meetingId);

    if (isError) {
        return (
            <Alert severity="error" className="rounded-xl">
                Kunne ikke hente dagsorden. Prøv at genindlæse siden.
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Box className="space-y-4">
                {[0, 1].map((k) => (
                    <Box key={k} className="space-y-3">
                        <Skeleton variant="rectangular" height={24} className="rounded" />
                        <Skeleton variant="rectangular" height={16} className="rounded" />
                        <Skeleton variant="rectangular" height={100} className="rounded" />
                    </Box>
                ))}
            </Box>
        );
    }

    if (!agendaItems?.length) {
        return (
            <Box className="text-center py-8">
                <Typography variant="body1" color="text.secondary">
                    Ingen dagsordenspunkter endnu.
                </Typography>
            </Box>
        );
    }

    return (
        <Box className="space-y-4">
            {agendaItems.map((item) => (
                <AgendaItemCard key={item.id} meetingId={meetingId} agendaItem={item} />
            ))}
        </Box>
    );
};

