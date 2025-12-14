import React from "react";
import { Box, Button, Divider, IconButton, Typography, Chip } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import type { VotationResultsResponse } from "../../../../../Redux/voteApi.ts";
import type { AgendaItemFull } from "../../../../../domain/agenda.ts";
import type { PropositionDto } from "../../../../../domain/propositions.ts";

type Props = {
    selectedAgenda: AgendaItemFull | null;
    selectedProposition: PropositionDto | null;
    showResults: boolean;
    setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
    handleOpenVote: () => void;
    handleCloseVote: () => void;
    handlePrevVote: () => void;
    handleNextVote: () => void;
    handleStartReVote: () => void;
    isOpeningVote: boolean;
    isClosingVote: boolean;
    hasOpenVotation: boolean;
    // whether the currently-selected proposition is the one that has an open votation
    isSelectedPropositionOpen?: boolean;
    voteResults?: VotationResultsResponse | undefined;
};

export function AdminLivePropositionControls({
    selectedAgenda,
    selectedProposition,
    showResults,
    setShowResults,
    handleOpenVote,
    handleCloseVote,
    handlePrevVote,
    handleNextVote,
    handleStartReVote,
    isOpeningVote,
    isClosingVote,
    hasOpenVotation,
    isSelectedPropositionOpen,
    voteResults,
}: Props) {
    // Disable open if:
    //  - there is no selection OR
    //  - index invalid OR
    //  - ANY votation is already open (no other proposition may be opened while one is open)
    //  - or an open/close operation is in progress

    const hasSelection = !!(selectedAgenda && selectedProposition);

    const openDisabled = !hasSelection || hasOpenVotation || isOpeningVote || isClosingVote;

    // Close should be enabled only when the selected proposition is the one currently open
    const closeDisabled = !hasSelection || !hasOpenVotation || !isSelectedPropositionOpen || isOpeningVote || isClosingVote;

    return (
        <Box sx={{ p: 2, bgcolor: (t) => t.palette.background.paper }}>
            <Divider />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                <Button
                    variant="contained"
                    startIcon={isOpeningVote ? <PlayArrowRoundedIcon /> : <PlayArrowRoundedIcon />}
                    disabled={openDisabled}
                    onClick={handleOpenVote}
                >
                    {isOpeningVote ? "Opening..." : "Open vote"}
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<StopRoundedIcon />}
                    disabled={closeDisabled}
                    onClick={handleCloseVote}
                >
                    {isClosingVote ? "Closing..." : "Close vote"}
                </Button>

                <Box sx={{ flex: 1 }} />

                {/* Prev/Next disabled when no selection or at bounds; calculations rely on selectedAgenda/proposition presence. */}
                {(() => {
                    if (!selectedAgenda || !selectedProposition) return (
                        <>
                            <Button variant="text" startIcon={<NavigateBeforeRoundedIcon />} disabled>Previous</Button>
                            <Button variant="text" endIcon={<NavigateNextRoundedIcon />} disabled>Next</Button>
                        </>
                    );

                    const list = selectedAgenda.propositions ?? [];
                    const idx = list.findIndex((p: any) => p.id === selectedProposition.id);

                    return (
                        <>
                            <Button variant="text" startIcon={<NavigateBeforeRoundedIcon />} disabled={idx <= 0} onClick={handlePrevVote}>Previous</Button>
                            <Button variant="text" endIcon={<NavigateNextRoundedIcon />} disabled={idx < 0 || idx >= list.length - 1} onClick={handleNextVote}>Next</Button>
                        </>
                    );
                })()}

                <IconButton size="small" onClick={() => setShowResults((s) => !s)} title={showResults ? 'Hide results' : 'Show results'}>
                    <VisibilityRoundedIcon color={showResults ? 'primary' : 'inherit'} />
                </IconButton>
            </Box>

            {/* Optional brief results preview when toggled on */}
            {showResults && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">Results preview</Typography>
                    {voteResults && voteResults.results && voteResults.results.length > 0 ? (
                        <Box sx={{ mt: 1 }}>
                            {voteResults.results.map((r: any) => (
                                <Box key={r.voteOptionId} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                    <Typography variant="body2">{r.label}</Typography>
                                    <Chip size="small" label={r.count} color={r.count > 0 ? 'primary' : 'default'} />
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="caption" color="text.secondary">No results available</Typography>
                    )}
                </Box>
            )}

            {/* Re-vote button */}
            <Box sx={{ mt: 2 }}>
                <Button variant="outlined" color="secondary" startIcon={<ReplayRoundedIcon />} disabled fullWidth onClick={handleStartReVote}>Start re-vote</Button>
            </Box>
        </Box>
    );
}

export default AdminLivePropositionControls;
