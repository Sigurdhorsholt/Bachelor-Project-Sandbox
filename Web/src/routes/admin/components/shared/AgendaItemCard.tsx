// components/attendee/AgendaItemCard.tsx
import React from "react";
import {Box, Card, CardContent, Divider, Typography} from "@mui/material";
import {PropositionCard} from "./PropositionCard";
import type {AgendaItemDto, AgendaItemFull} from "../../../../domain/agenda.ts";

type AgendaItemCardProps = {
    meetingId: string;
    agendaItem: AgendaItemFull;
};

export const AgendaItemCard = ({meetingId, agendaItem}: AgendaItemCardProps) => {
    const hasDescription = Boolean(agendaItem.description && agendaItem.description.trim().length > 0);

    return (
        <Card variant="outlined" className="rounded-xl">
            <CardContent className="p-4 sm:p-6">
                <Typography variant="h6" fontWeight={800}>
                    {agendaItem.title}
                </Typography>
                {hasDescription ? (
                    <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
                        {agendaItem.description}
                    </Typography>
                ) : null}

                <Divider sx={{my: 2}}/>

                <Box className="space-y-3">
                    {agendaItem.propositions?.length
                        ? agendaItem.propositions.map((p) => (
                            <PropositionCard key={p.id} meetingId={meetingId} proposition={p}/>
                        ))
                        : (
                            <Typography variant="body2" color="text.secondary">
                                No propositions for this item.
                            </Typography>
                        )}
                </Box>
            </CardContent>
        </Card>
    );
};
