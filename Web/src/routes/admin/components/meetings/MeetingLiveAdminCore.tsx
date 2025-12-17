import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Typography, Divider } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

import AdminLiveAgendaList from "./meetingLiveAdmin/AdminLiveAgendaList";
import AdminLivePropositionPane from "./meetingLiveAdmin/AdminLivePropositionPane";
import AdminLiveMonitorOverview from "./meetingLiveAdmin/AdminLiveMonitorOverview";

import { useStartMeetingMutation, useStopMeetingMutation } from "../../../../Redux/meetingsApi.ts";
import { useGetOpenVotationsByMeetingIdQuery } from "../../../../Redux/votationApi.ts";
import { useMeetingChannel } from "../../../../realTime/useMeetingChannel.ts";
import type { MeetingDto } from "../../../../domain/meetings.ts";
import type { AgendaItemFull } from "../../../../domain/agenda.ts";
import type { PropositionDto } from "../../../../domain/propositions.ts";

type MeetingLiveAdminCoreProps = {
    meeting: MeetingDto;
    agendaList: AgendaItemFull[];
};

/**
 * Data flow:
 * - Receives meeting and agenda from parent loader
 * - Maintains local selection state
 * - Passes IDs and selection callbacks to child components
 * - Child components fetch their own data via RTK Query
 */
export default function MeetingLiveAdminCore({ meeting, agendaList }: MeetingLiveAdminCoreProps) {
    const navigate = useNavigate();
    const [selectedAgenda, setSelectedAgenda] = useState<AgendaItemFull | null>(agendaList[0] || null);
    const [selectedProposition, setSelectedProposition] = useState<PropositionDto | null>(null);

    const [startMeeting, { isLoading: isStarting }] = useStartMeetingMutation();
    const [stopMeeting, { isLoading: isStopping }] = useStopMeetingMutation();
    const { data: openVotations = [] } = useGetOpenVotationsByMeetingIdQuery(meeting.id);
    const openVotation = openVotations.find(v => v.meetingId === meeting.id);

    // Subscribe to SignalR meeting channel for real-time updates
    useMeetingChannel(meeting.id);

    const handleStartMeeting = async () => {
        try {
            await startMeeting({ id: meeting.id }).unwrap();
        } catch (error) {
            console.error("Failed to start meeting:", error);
        }
    };

    const handleStopMeeting = async () => {
        try {
            await stopMeeting({ id: meeting.id }).unwrap();
        } catch (error) {
            console.error("Failed to stop meeting:", error);
        }
    };

    return (
        <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header with back/start/stop buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
                    Back
                </Button>
                <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    Live Administration: {meeting.title} - Meeting Code {meeting.meetingCode}
                </Typography>
                <Button
                    variant={meeting.started ? "outlined" : "contained"}
                    color="success"
                    startIcon={<PlayCircleOutlineIcon />}
                    onClick={handleStartMeeting}
                    disabled={!!meeting.started || isStarting}
                >
                    {isStarting ? "Starting..." : meeting.started ? "Meeting Started" : "Start Meeting"}
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<PowerSettingsNewRoundedIcon />}
                    onClick={handleStopMeeting}
                    disabled={!meeting.started || isStopping}
                >
                    {isStopping ? "Stopping..." : "Stop Meeting"}
                </Button>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Main content: 2-column layout (agenda + propositions) + full-width monitor */}
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Top section: Agenda + Propositions (side by side) */}
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                    gap: 3, 
                    height: '50%',
                    minHeight: 0 
                }}>
                    <AdminLiveAgendaList
                        agenda={agendaList}
                        selectedAgenda={selectedAgenda}
                        onSelectAgenda={setSelectedAgenda}
                        openVotationPropositionId={openVotation?.propositionId}
                    />
                    <AdminLivePropositionPane
                        meetingId={meeting.id}
                        meeting={meeting}
                        selectedAgenda={selectedAgenda}
                        selectedProposition={selectedProposition}
                        setSelectedProposition={setSelectedProposition}
                    />
                </Box>

                {/* Bottom section: Live Monitor Overview (full width) */}
                <Box sx={{ height: '50%', minHeight: 0 }}>
                    <AdminLiveMonitorOverview
                        meetingId={meeting.id}
                        selectedPropositionId={selectedProposition?.id}
                        selectedAgendaId={selectedAgenda?.id}
                    />
                </Box>
            </Box>
        </Box>
    );
}
