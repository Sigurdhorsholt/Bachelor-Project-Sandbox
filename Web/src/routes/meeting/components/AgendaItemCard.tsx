// components/AgendaItemCard.tsx
// Displays a single agenda item with its propositions.

import React from "react";
import { Box, Card, CardContent, Divider, Typography } from "@mui/material";
import { PropositionCard } from "./PropositionCard";
import type { AgendaItemFull } from "../../../domain/agenda";

type Props = {
    meetingId: string;
    agendaItem: AgendaItemFull;
};

export const AgendaItemCard: React.FC<Props> = ({ meetingId, agendaItem }) => {
    const hasDescription = Boolean(agendaItem.description?.trim());

    return (
        <Card className="rounded-m shadow-sm">
            <CardContent className="p-4 sm:p-6">
                <Typography variant="h6" fontWeight={800} color="primary.main">
                    {agendaItem.title}
                </Typography>
                {hasDescription && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {agendaItem.description}
                    </Typography>
                )}

                <Divider sx={{ my: 1 }} />

                <Box className="space-y-2">
                    {agendaItem.propositions?.length ? (
                        agendaItem.propositions.map((p, idx) => (
                            <React.Fragment key={p.id}>
                                <PropositionCard meetingId={meetingId} proposition={p} />
                                {idx < agendaItem.propositions.length - 1 && (
                                    <Divider sx={{ my: 2 }} />
                                )}
                            </React.Fragment>
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" className="text-center">
                            Ingen forslag til dette punkt.
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

