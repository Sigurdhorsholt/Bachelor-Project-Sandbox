import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress, Divider, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

// Add component imports
import AgendaList from "./meetingLiveAdmin/AdminLiveAgendaList";
import PropositionPane from "./meetingLiveAdmin/AdminLivePropositionPane";
import LiveMonitorOverview from "./meetingLiveAdmin/AdminLiveMonitorOverview";

import {
    useStartMeetingMutation,
    useStopMeetingMutation,
    useGetVotationsByPropositionQuery
} from "../../../../Redux/meetingsApi.ts";
import { useMeetingChannel } from "../../../../realTime/useMeetingChannel.ts";
import type { MeetingDto } from "../../../../domain/meetings.ts";
import type { AgendaItemFull } from "../../../../domain/agenda.ts";
import { useStartVoteAndCreateVotationMutation, useStopVotationMutation, useGetOpenVotationsByMeetingIdQuery } from "../../../../Redux/votationApi.ts";
import type {PropositionDto} from "../../../../domain/propositions.ts";

type MeetingLiveAdminCoreProps = {
    meeting: MeetingDto;
    agendaList: AgendaItemFull[];
};

export default function MeetingLiveAdminCore({ meeting, agendaList }: MeetingLiveAdminCoreProps) {
    const navigate = useNavigate();

    // Start SignalR subscription now that meeting exists
    useMeetingChannel(meeting.id);

    // Selection state: choose agenda item first, then proposition
    // Use object-based selections instead of indices
    const [selectedAgenda, setSelectedAgenda] = useState<AgendaItemFull | null>(null);
    const [selectedProposition, setSelectedProposition] = useState<PropositionDto | null>(null);

    // New: control visibility of results/minutes panel (kept for quick preview)
    const [showResults, setShowResults] = useState<boolean>(false);

    // prefixed setters are unused placeholders to avoid lint warnings until wired up
    const [attendance, _setAttendance] = useState({ present: 0, registered: 0 });

    const [startMeeting, { isLoading: isStartingMeeting }] = useStartMeetingMutation();
    const [stopMeeting, { isLoading: isStoppingMeeting }] = useStopMeetingMutation();

    // Hooks for starting/stopping votations — provide these to the proposition pane so it can call them
    const [startVoteAndCreateVotationHook, { isLoading: isOpeningVote }] = useStartVoteAndCreateVotationMutation();
    const [stopVotationHook, { isLoading: isClosingVote }] = useStopVotationMutation();

    // simple wrapper functions for the pane — keep mutations local to this parent
    const startVote = (propositionId: string) => {
        if (!meeting) return;
        startVoteAndCreateVotationHook({ meetingId: meeting.id, propositionId });
    };

    const stopVotation = (propositionId: string) => {
        stopVotationHook(propositionId);
    };

    useEffect(() => {
        setSelectedAgenda(null);
        setSelectedProposition(null);
    }, [meeting.id, agendaList]);


    // Fetch votations for the selected proposition
    const { data: votations } = useGetVotationsByPropositionQuery(
        { meetingId: meeting.id, propositionId: selectedProposition?.id ?? "" },
        { skip: !selectedProposition }
    );

    // Check if there's an open votation for the selected proposition
    const openVotation = votations?.find(v => v.open);
    
    // Also fetch all open votations for the meeting so we can disable opening on other propositions
    const { data: openVotationsForMeeting } = useGetOpenVotationsByMeetingIdQuery(meeting.id);
    const hasAnyOpenVotation = (openVotationsForMeeting?.length ?? 0) > 0;

    const goBack = () => navigate(-1);

    const handleFinalizeResults = () => {
        // TODO: finalize/export results for minutes
    };

    const handleStartReVote = () => {
        // TODO: start a re-vote (allow hybrid paper inputs)
    };


    const handleStartMeeting = () => {
        if (meeting){
            startMeeting({ id: meeting.id });
        }
    };

    const handleStopMeeting = () => {
        if (meeting){
            stopMeeting({ id: meeting.id });
        }
    };


    return (
        <Box
            className="min-h-screen"
            sx={{
                bgcolor: "background.default",
            }}
        >
            {/* Header */}
            <Box
                className="px-4 md:px-6 py-4"
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 5,
                    backdropFilter: "saturate(180%) blur(6px)",
                    bgcolor: (t) => t.palette.background.paper,
                }}
            >
                <Box className="flex items-center justify-between">
                    <Box className="space-y-0.5">
                        <Typography variant="h5" fontWeight={700}>
                            Live: {meeting.title ?? "—"}
                        </Typography>
                    </Box>

                    <Box className="flex gap-2">
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackRoundedIcon />}
                            onClick={goBack}
                        >
                            Back
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={isStartingMeeting ? <CircularProgress size={20} color="inherit" /> : <PlayCircleOutlineIcon />}
                            disabled={meeting.started === 1 || isStartingMeeting || isStoppingMeeting}
                            onClick={handleStartMeeting}
                        >
                            {isStartingMeeting ? "Starting..." : "Start Møde"}
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={isStoppingMeeting ? <CircularProgress size={20} color="inherit" /> : <PowerSettingsNewRoundedIcon />}
                            disabled={meeting.started === 0 || isStartingMeeting || isStoppingMeeting}
                            onClick={handleStopMeeting}
                        >
                            {isStoppingMeeting ? "Stopping..." : "Stop Møde"}
                        </Button>

                    </Box>
                </Box>
            </Box>
            <Divider />

            {/* Content - now with 3 locked parts: top-left Agenda, top-right Propositions, bottom Live Monitor + Overview */}
            <Box className="px-4 md:px-6 py-6">
                {/* TOP - fixed height, two columns that scroll internally */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '360px 1fr' }, gap: 16, height: '48vh' }}>
                    <AgendaList
                        agenda={agendaList}
                        selectedAgenda={selectedAgenda}
                        onSelectAgenda={(a) => {
                            setSelectedAgenda(a);
                            setSelectedProposition((a?.propositions?.length ?? 0) > 0 ? a!.propositions[0] : null);
                        }}
                    />

                    <PropositionPane
                         selectedAgenda={selectedAgenda}
                         selectedProposition={selectedProposition}
                         setSelectedProposition={setSelectedProposition}
                         showResults={showResults}
                         setShowResults={setShowResults}
                         stopVotation={stopVotation}
                         hasOpenVotation={hasAnyOpenVotation}
                         openVotation={openVotation}
                         handleStartReVote={handleStartReVote}
                         isOpeningVote={isOpeningVote}
                         isClosingVote={isClosingVote}
                         startVote={startVote}
                      />
                 </Box>

                {/* BOTTOM - Live monitor + meeting overview combined; fixed height and internal scrolling if needed */}
                <Box sx={{ mt: 3, height: '44vh' }}>
                    <LiveMonitorOverview
                        meeting={meeting}
                        selectedProposition={selectedProposition}
                        selectedAgenda={selectedAgenda}
                        setSelectedProposition={setSelectedProposition}
                        showResults={showResults}
                        setShowResults={setShowResults}
                        startVote={startVote}
                        stopVotation={stopVotation}
                        openVotation={openVotation}
                        hasOpenVotation={hasAnyOpenVotation}
                        attendance={attendance}
                        handleStartMeeting={handleStartMeeting}
                        handleStopMeeting={handleStopMeeting}
                        isStartingMeeting={isStartingMeeting}
                        isStoppingMeeting={isStoppingMeeting}
                        handleFinalizeResults={handleFinalizeResults}
                        handleStartReVote={handleStartReVote}
                        isOpeningVote={isOpeningVote}
                        isClosingVote={isClosingVote}
                    />

                </Box>
            </Box>
        </Box>
    );
}
