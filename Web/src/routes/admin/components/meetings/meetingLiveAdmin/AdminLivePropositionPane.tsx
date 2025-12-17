import React from "react";
import { Box, Card, CardContent, CardHeader, Chip, Divider, List, ListItem, ListItemButton, ListItemText, Typography, Button } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";

import { 
    useStartVoteAndCreateVotationMutation, 
    useStopVotationMutation, 
    useStartReVoteMutation,
    useGetOpenVotationsByMeetingIdQuery 
} from "../../../../../Redux/votationApi.ts";
import type { AgendaItemFull } from "../../../../../domain/agenda.ts";
import type { PropositionDto } from "../../../../../domain/propositions.ts";

type Props = {
    meetingId: string;
    selectedAgenda: AgendaItemFull | null;
    selectedProposition: PropositionDto | null;
    setSelectedProposition: React.Dispatch<React.SetStateAction<PropositionDto | null>>;
};

export function AdminLivePropositionPane({
    meetingId,
    selectedAgenda,
    selectedProposition,
    setSelectedProposition,
}: Props) {

    const { data: openVotations = [] } = useGetOpenVotationsByMeetingIdQuery(meetingId);
    const [startVote, { isLoading: isOpeningVote }] = useStartVoteAndCreateVotationMutation();
    const [stopVote, { isLoading: isClosingVote }] = useStopVotationMutation();
    const [startReVote] = useStartReVoteMutation();
    const openVotation = openVotations.find(v => v.meetingId === meetingId);
    const isSelectedPropositionOpen = !!(openVotation && selectedProposition && openVotation.propositionId === selectedProposition.id);

    const handleOpenVote = async () => {
        if (!selectedProposition) return;
        try {
            await startVote({ meetingId, propositionId: selectedProposition.id }).unwrap();
        } catch (error) {
            console.error("Failed to open vote:", error);
        }
    };

    const handleCloseVote = async () => {
        if (!selectedProposition) return;
        try {
            await stopVote(selectedProposition.id).unwrap();
        } catch (error) {
            console.error("Failed to close vote:", error);
        }
    };

    const handleReVote = async () => {
        if (!selectedProposition) return;
        try {
            await startReVote(selectedProposition.id).unwrap();
        } catch (error) {
            console.error("Failed to start re-vote:", error);
        }
    };

    const hasOpenVotation = openVotations.length > 0;
    const canOpenVote = selectedProposition && !hasOpenVotation && !selectedProposition.latestVotation?.open;
    const canCloseVote = selectedProposition && isSelectedPropositionOpen;
    const canReVote = selectedProposition?.latestVotation && !selectedProposition.latestVotation.open;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card elevation={1} className="rounded-2xl" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                    title={selectedAgenda ? `Propositions — ${selectedAgenda.title}` : 'Propositions'}
                    sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }}
                />
                <Divider />

                <CardContent sx={{ overflow: 'auto', flex: 1, p: 0 }}>
                    <List disablePadding>
                        {(selectedAgenda?.propositions ?? []).length === 0 && (
                            <ListItem>
                                <ListItemText primary={<Typography color="text.secondary">No propositions in this agenda</Typography>} />
                            </ListItem>
                        )}

                        {(selectedAgenda?.propositions ?? []).map((p: PropositionDto, pIdx: number) => {
                            // Check if this proposition is currently open for voting
                            const isOpenForVoting = openVotation && openVotation.propositionId === p.id;
                            
                            return (
                                <React.Fragment key={p.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            selected={selectedProposition?.id === p.id}
                                            onClick={() => setSelectedProposition(p)}
                                            sx={{
                                                // Highlight if open for voting
                                                ...(isOpenForVoting && {
                                                    bgcolor: (t) => t.palette.success.light,
                                                    borderLeft: (t) => `4px solid ${t.palette.success.main}`,
                                                    pl: 1.5,
                                                    '&:hover': {
                                                        bgcolor: (t) => t.palette.success.light,
                                                    },
                                                }),
                                                // Normal selection style
                                                '&.Mui-selected': {
                                                    bgcolor: (t) => isOpenForVoting ? t.palette.success.light : t.palette.action.selected,
                                                    borderLeft: (t) => isOpenForVoting
                                                        ? `4px solid ${t.palette.success.main}`
                                                        : `3px solid ${t.palette.primary.main}`,
                                                    pl: 1.5,
                                                    color: (t) => t.palette.text.primary,
                                                    boxShadow: 1,
                                                },
                                                py: 2,
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography fontWeight={700}>{p.question}</Typography>
                                                        {isOpenForVoting && (
                                                            <Chip 
                                                                size="small" 
                                                                label="VOTING OPEN" 
                                                                color="success" 
                                                                sx={{ fontWeight: 700, animation: 'pulse 2s infinite' }}
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={p.voteType ? (<Typography variant="body2" color="text.secondary">{p.voteType}</Typography>) : undefined}
                                            />
                                            <Box className="ml-2">
                                                {p.voteType && !isOpenForVoting && <Chip size="small" label={p.voteType} />}
                                            </Box>
                                        </ListItemButton>
                                    </ListItem>

                                    {pIdx < (selectedAgenda?.propositions?.length ?? 1) - 1 && (
                                        <Divider component="li" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </List>
                </CardContent>

                {/* Inline vote controls */}
                {selectedProposition && (
                    <>
                        <Divider />
                        <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap', bgcolor: (t) => t.palette.background.default }}>
                            <Button
                                variant="contained"
                                color="success"
                                size="small"
                                startIcon={<PlayArrowRoundedIcon />}
                                disabled={!canOpenVote || isOpeningVote}
                                onClick={handleOpenVote}
                            >
                                {isOpeningVote ? "Opening..." : "Open Vote"}
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                startIcon={<StopRoundedIcon />}
                                disabled={!canCloseVote || isClosingVote}
                                onClick={handleCloseVote}
                            >
                                {isClosingVote ? "Closing..." : "Close Vote"}
                            </Button>
                            <Box sx={{ flex: 1 }} />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ReplayRoundedIcon />}
                                disabled={!canReVote}
                                onClick={handleReVote}
                            >
                                Re-vote
                            </Button>
                        </Box>
                    </>
                )}
            </Card>
        </Box>
    );
}

export default AdminLivePropositionPane;
