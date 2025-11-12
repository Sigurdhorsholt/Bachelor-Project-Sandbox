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
        <Card className="rounded-xl" sx={{ border: 'none', borderBottom: '1px solid #e2e8f0' }}>
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

                <Box className="space-y-0">
                    {agendaItem.propositions?.length
                        ? agendaItem.propositions.map((p, idx) => (
                            <React.Fragment key={p.id}>
                                <PropositionCard meetingId={meetingId} proposition={p}/>
                                {idx < agendaItem.propositions.length - 1 && <Divider sx={{my: 1}} />}
                            </React.Fragment>
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
