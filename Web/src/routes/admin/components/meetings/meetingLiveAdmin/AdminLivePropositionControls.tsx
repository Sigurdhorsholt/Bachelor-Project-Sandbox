import React from "react";
import {Box, Button, Divider} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";

import {
    useStartVoteAndCreateVotationMutation,
    useStopVotationMutation,
    useStartReVoteMutation,
    useGetOpenVotationsByMeetingIdQuery
} from "../../../../../Redux/votationApi.ts";
import type {PropositionDto} from "../../../../../domain/propositions.ts";
import type {MeetingDto} from "../../../../../domain/meetings.ts";

type Props = {
    meetingId: string;
    meeting: MeetingDto;
    selectedProposition: PropositionDto | null;
};

export function AdminLivePropositionControls({
                                               meetingId,
                                               meeting,
                                               selectedProposition,
                                           }: Props) {
    const {data: openVotations = []} = useGetOpenVotationsByMeetingIdQuery(meetingId);
    const [startVote, {isLoading: isOpeningVote}] = useStartVoteAndCreateVotationMutation();
    const [stopVote, {isLoading: isClosingVote}] = useStopVotationMutation();
    const [startReVote, {isLoading: isReVoting}] = useStartReVoteMutation();

    const hasOpenVotation = openVotations.some(v => v.open);
    const openVotationForSelected = selectedProposition ? openVotations.find(v => v.propositionId === selectedProposition.id) : undefined;
    const isSelectedPropositionOpen = !!openVotationForSelected;

    const handleOpenVote = async () => {
        if (!selectedProposition) return;
        try {
            await startVote({meetingId, propositionId: selectedProposition.id}).unwrap();
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
            const res = await startReVote({ propositionId: selectedProposition.id, meetingId }).unwrap();
            // RTK Query invalidation should refresh agenda/latestVotation and open votations
            console.debug("Re-vote response:", res);
        } catch (error) {
            console.error("Failed to start re-vote:", error);
        }
    };


    // A votation has results if the selected proposition has a latestVotation that is closed and not overwritten
    const hasClosedVotation = !!(selectedProposition?.latestVotation && !selectedProposition.latestVotation.open && !selectedProposition.latestVotation.overwritten);
    const isMeetingStarted = !!meeting.started;

    // Open vote is enabled when:
    // - Meeting is started
    // - Proposition is selected
    // - No votation is currently open for ANY proposition in the meeting
    // - Selected proposition doesn't have a closed votation with valid results (not overwritten)
    const canOpenVote = isMeetingStarted && !!selectedProposition && !hasOpenVotation && !hasClosedVotation;

    const canCloseVote = !!selectedProposition && isSelectedPropositionOpen;

    // Re-vote is enabled when:
    // - Proposition has a closed votation with results (not overwritten)
    // - No votation is currently open (re-vote will create a new one)
    const canReVote = hasClosedVotation && !hasOpenVotation;

    if (!selectedProposition) return null;

    return (
        <>
            <Divider/>
            <Box sx={{p: 2, display: 'flex', gap: 1, flexWrap: 'wrap', bgcolor: (t) => t.palette.background.default}}>
                <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<PlayArrowRoundedIcon/>}
                    disabled={!canOpenVote || isOpeningVote}
                    onClick={handleOpenVote}
                >
                    {isOpeningVote ? "Opening..." : "Open Vote"}
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<StopRoundedIcon/>}
                    disabled={!canCloseVote || isClosingVote}
                    onClick={handleCloseVote}
                >
                    {isClosingVote ? "Closing..." : "Close Vote"}
                </Button>
                <Box sx={{flex: 1}}/>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReplayRoundedIcon/>}
                    disabled={!canReVote || isReVoting}
                    onClick={handleReVote}
                >
                    {isReVoting ? "Re-voting..." : "Re-vote"}
                </Button>
            </Box>
        </>
    );
}