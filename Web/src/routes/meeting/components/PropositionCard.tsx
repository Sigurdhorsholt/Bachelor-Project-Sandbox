// components/PropositionCard.tsx
// Displays a single proposition with vote panel, fetches open votations.

import React, { useMemo, useState, useEffect } from "react";
//import { Box, Chip, Typography, Collapse, IconButton, Paper } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import type { PropositionDto } from "../../../domain/propositions";
import { VotePanel } from "../VotePanel";
import { useGetOpenVotationsByMeetingIdQuery } from "../../../Redux/votationApi";
import {Box, Chip, Collapse, IconButton, Paper, Typography} from "@mui/material";

type Props = {
    meetingId: string;
    proposition: PropositionDto;
};

export const PropositionCard: React.FC<Props> = ({ meetingId, proposition }) => {
    // Fetch open votations for this meeting
    const { data: openVotations } = useGetOpenVotationsByMeetingIdQuery(meetingId);

    // Check if this proposition has an open votation
    const openVotation = useMemo(
        () => openVotations?.find((v) => v.propositionId === proposition.id && v.open),
        [openVotations, proposition.id]
    );

    const isOpen = Boolean(openVotation);
    const [collapsed, setCollapsed] = useState(!isOpen);

    // Auto-expand when vote opens, auto-collapse when vote closes
    useEffect(() => {
        if (isOpen) {
            setCollapsed(false);
        } else {
            setCollapsed(true);
        }
    }, [isOpen]);

    const handleToggle = () => setCollapsed((prev) => !prev);

    return (
        <Paper elevation={0} className="p-3 sm:p-4 bg-slate-50 rounded-lg">
            <Box className="flex items-start justify-between gap-3">
                <Typography variant="subtitle1" fontWeight={700}>
                    {proposition.question}
                </Typography>
                <Box className="flex items-center gap-2">
                    <Chip
                        size="small"
                        label={isOpen ? "Åben" : "Lukket"}
                        color={isOpen ? "success" : "default"}
                        variant={isOpen ? "filled" : "outlined"}
                    />
                    {!isOpen && (
                        <IconButton
                            size="small"
                            onClick={handleToggle}
                            aria-label={collapsed ? "Udvid" : "Skjul"}
                        >
                            {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                        </IconButton>
                    )}
                </Box>
            </Box>

            <Box className="mt-3">
                <Collapse in={isOpen || !collapsed}>
                    <VotePanel
                        meetingId={meetingId}
                        proposition={proposition}
                        votationId={openVotation?.id}
                        isOpen={isOpen}
                    />
                </Collapse>
            </Box>
        </Paper>
    );
};
