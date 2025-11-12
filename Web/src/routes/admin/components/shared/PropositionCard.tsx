// components/attendee/PropositionCard.tsx
import React, { useMemo, useState } from "react";
import { Box, Chip, Paper, Typography, Collapse, IconButton } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
    const [collapsed, setCollapsed] = useState(!isOpen);

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
                        isOpen={isOpen}
                    />
                </Collapse>
            </Box>
        </Paper>
    );
};
