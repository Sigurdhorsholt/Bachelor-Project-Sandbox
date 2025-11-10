// components/attendee/PropositionCard.tsx
import React, { useMemo } from "react";
import { Box, Chip, Paper, Typography } from "@mui/material";
import type {PropositionDto} from "../../../../domain/propositions.ts";
import {VotePanel} from "../../../meeting/VotePanel.tsx";


type Props = {
    meetingId: string;
    proposition: PropositionDto;
};

export const PropositionCard: React.FC<Props> = ({ meetingId, proposition }) => {
    // For now, all propositions are CLOSED until SignalR says "open".
    // Later, replace with real state from hub message.
    const isOpen = useMemo(() => false, []);

    return (
        <Paper variant="outlined" className="rounded-lg p-3 sm:p-4">
            <Box className="flex items-start justify-between gap-3">
                <Typography variant="subtitle1" fontWeight={700}>
                    {proposition.question}
                </Typography>
                <Chip
                    size="small"
                    label={isOpen ? "Open" : "Closed"}
                    color={isOpen ? "success" : "default"}
                    variant="outlined"
                />
            </Box>

            <Box className="mt-3">
                <VotePanel
                    meetingId={meetingId}
                    proposition={proposition}
                    isOpen={isOpen}
                />
            </Box>
        </Paper>
    );
};
