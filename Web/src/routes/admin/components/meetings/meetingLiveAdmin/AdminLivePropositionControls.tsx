import React from "react";
import {Box, Button, Divider, IconButton, Typography, Chip} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";

import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import type {AgendaItemFull} from "../../../../../domain/agenda.ts";
import type {PropositionDto} from "../../../../../domain/propositions.ts";
import type {VotationResultsDto} from "../../../../../Redux/votationApi.ts";

type Props = {
    selectedAgenda: AgendaItemFull | null;
    selectedProposition?: PropositionDto;
    showResults: boolean;
    setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
    handleOpenVote: () => void;
    handleCloseVote: () => void;
    handleStartReVote: () => void;
    isOpeningVote: boolean;
    isClosingVote: boolean;
    hasOpenVotation: boolean;
    isSelectedPropositionOpen?: boolean;
    voteResults?: VotationResultsDto;
};

export function AdminLivePropositionControls({
                                                 selectedAgenda,
                                                 selectedProposition,
                                                 showResults,
                                                 setShowResults,
                                                 handleOpenVote,
                                                 handleCloseVote,
                                                 handleStartReVote,
                                                 isOpeningVote,
                                                 isClosingVote,
                                                 hasOpenVotation,
                                                 isSelectedPropositionOpen,
                                                 voteResults,
                                             }: Props) {
    const hasSelection = !!(selectedAgenda && selectedProposition);
    const openDisabled = !hasSelection || hasOpenVotation || isOpeningVote || isClosingVote;
    const closeDisabled = !hasSelection || !hasOpenVotation || !isSelectedPropositionOpen || isOpeningVote || isClosingVote;
    const voteHasResults = Boolean(voteResults && voteResults.open === false);
    const canReVote = Boolean(voteResults && voteResults.open === false);

    return (
        <Box sx={{p: 2, bgcolor: (t) => t.palette.background.paper}}>
            <Divider/>
            <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1}}>
                <Button
                    variant="contained"
                    startIcon={isOpeningVote ? <PlayArrowRoundedIcon/> : <PlayArrowRoundedIcon/>}
                    disabled={openDisabled || voteHasResults}
                    onClick={handleOpenVote}
                >
                    {isOpeningVote ? "Opening..." : "Open vote"}
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<StopRoundedIcon/>}
                    disabled={closeDisabled}
                    onClick={handleCloseVote}
                >
                    {isClosingVote ? "Closing..." : "Close vote"}
                </Button>

                <Box sx={{flex: 1}}/>
                <IconButton size="small" onClick={() => setShowResults((s) => !s)}
                            title={showResults ? 'Hide results' : 'Show results'}>
                    <VisibilityRoundedIcon color={showResults ? 'primary' : 'inherit'}/>
                </IconButton>
            </Box>

            {/* Optional brief results preview when toggled on */}
            {showResults && (
                <Box sx={{mt: 2}}>
                    <Typography variant="caption" color="text.secondary">Results preview</Typography>
                    {voteResults && voteResults.results && voteResults.results.length > 0 ? (
                        <Box sx={{mt: 1}}>
                            {voteResults.results.map((r: any) => (
                                <Box key={r.voteOptionId}
                                     sx={{display: 'flex', justifyContent: 'space-between', py: 0.5}}>
                                    <Typography variant="body2">{r.label}</Typography>
                                    <Chip size="small" label={r.count} color={r.count > 0 ? 'primary' : 'default'}/>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="caption" color="text.secondary">No results available</Typography>
                    )}
                </Box>
            )}

            {/* Re-vote button */}
            <Box sx={{mt: 2}}>
                <Button variant="outlined"
                        color="primary"
                        startIcon={<ReplayRoundedIcon/>}
                        fullWidth
                        onClick={handleStartReVote}
                        disabled={!canReVote}
                >
                    Start re-vote
                </Button>
            </Box>
        </Box>
    );
}