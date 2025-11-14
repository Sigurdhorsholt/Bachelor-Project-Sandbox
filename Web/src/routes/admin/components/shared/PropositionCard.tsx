// components/attendee/PropositionCard.tsx
import React, { useMemo, useState, useEffect } from "react";
import { Box, Chip, Paper, Typography, Collapse, IconButton } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type {PropositionDto} from "../../../../domain/propositions.ts";
import {VotePanel} from "../../../meeting/VotePanel.tsx";
import { useGetOpenVotationsByMeetingIdQuery } from "../../../../Redux/votationApi.ts";


type Props = {
    meetingId: string;
    proposition: PropositionDto;
};

export const PropositionCard: React.FC<Props> = ({ meetingId, proposition }) => {
    // Fetch open votations for this meeting
    const { data: openVotations } = useGetOpenVotationsByMeetingIdQuery(meetingId);
    
    // Check if this proposition has an open votation
    const openVotation = useMemo(() => 
        openVotations?.find(v => v.propositionId === proposition.id && v.open),
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
        <Paper className="rounded-none p-3 sm:p-4 bg-transparent shadow-none" sx={{ border: 'none' }}>
            <Box className="flex items-start justify-between gap-3">
                <Typography variant="subtitle1" fontWeight={700}>
                    {proposition.question}
                </Typography>
                <Box className="flex items-center gap-2">
                    <Chip
                        size="small"
                        label={isOpen ? "Open" : "Closed"}
                        color={isOpen ? "success" : "default"}
                        variant="outlined"
                    />
                    {!isOpen && (
                        <IconButton size="small" onClick={handleToggle} aria-label={collapsed ? "Expand" : "Collapse"}>
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
