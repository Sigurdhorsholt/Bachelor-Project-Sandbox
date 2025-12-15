import React from "react";
import { Box, Button, CardHeader, CardContent, Divider, Chip, Card, Typography } from "@mui/material";
import PictureInPictureAltRoundedIcon from "@mui/icons-material/PictureInPictureAltRounded";
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';

import AdminLivePropositionControls from "./AdminLivePropositionControls";
import type { AgendaItemFull } from "../../../../../domain/agenda.ts";
import type {PropositionDto} from "../../../../../domain/propositions.ts";
import { useGetVotationResultsQuery } from "../../../../../Redux/voteApi.ts";

type Props = {
    meeting: any;
    selectedAgenda?: AgendaItemFull | null;
    selectedProposition?: PropositionDto | null;
    setSelectedProposition?: React.Dispatch<React.SetStateAction<PropositionDto | null>>;
    openVotation?: any;
    attendance: { present: number; registered: number };
    // number of connected participants (admin-only realtime snapshot)
    participantsConnected?: number;
    handleFinalizeResults: () => void;
    // props for proposition controls
    showResults?: boolean;
    setShowResults?: React.Dispatch<React.SetStateAction<boolean>>;
    startVote?: (propositionId: string) => void;
    stopVotation?: (propositionId: string) => void;
    hasOpenVotation?: boolean;
    handleStartReVote?: () => void;
    isOpeningVote?: boolean;
    isClosingVote?: boolean;
};

export default function AdminLiveMonitorOverview({ meeting, selectedAgenda = null, selectedProposition = null, setSelectedProposition, openVotation, attendance, handleFinalizeResults, showResults = false, setShowResults, startVote, stopVotation, hasOpenVotation = false, handleStartReVote, isOpeningVote = false, isClosingVote = false, participantsConnected = 0 }: Props){
    // selectedProposition comes from parent; keep a local alias for clarity
    const selectedProp = selectedProposition ?? null;

    // compute whether currently selected proposition is the one open
    const isSelectedPropositionOpen = !!(openVotation && selectedProp && openVotation.propositionId === selectedProp.id);

    // Fetch live votation results for the open votation (if any)
    const { data: voteResults } = useGetVotationResultsQuery(openVotation?.id ?? "", { skip: !openVotation?.id, pollingInterval: 5000 });

    const handleOpenVote = () => {
        if (!selectedProp || !startVote) return;
        startVote(selectedProp.id);
    };

    const handleCloseVote = () => {
        if (!selectedProp || !stopVotation) return;
        if (openVotation && openVotation.propositionId !== selectedProp.id) return;
        stopVotation(selectedProp.id);
    };

    const handlePrevVote = () => {
        if (!setSelectedProposition || !selectedAgenda || !selectedProp) return;
        const list = selectedAgenda.propositions ?? [];
        const idx = list.findIndex((p: any) => p.id === selectedProp.id);
        if (idx <= 0) return;
        setSelectedProposition(list[idx - 1]);
    };

    const handleNextVote = () => {
        if (!setSelectedProposition || !selectedAgenda || !selectedProp) return;
        const list = selectedAgenda.propositions ?? [];
        const idx = list.findIndex((p: any) => p.id === selectedProp.id);
        if (idx < 0 || idx >= list.length - 1) return;
        setSelectedProposition(list[idx + 1]);
    };

    return (
        <Box sx={{ mt: 3, height: '44vh' }}>
            <Card elevation={1} className="rounded-2xl" sx={{ height: '100%', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1fr' } }}>
                <Box>
                    <CardHeader
                        title="Live monitor"
                        sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }}
                        action={<Chip size="small" label={meeting.started ? 'Live' : 'Idle'} variant="outlined" />}
                    />
                    <Divider />
                    <CardContent sx={{ overflow: 'auto', height: 'calc(100% - 72px)' }}>
                        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Vote progress:</Typography>
                                <Typography variant="h6" fontWeight={800}>{openVotation?.totalVotes ?? 0} votes cast</Typography>
                            </Box>

                            <Box sx={{ flex: 1 }}>
                                {/* Render the proposition's own voteOptions directly (don't rely on external voteResults here) */}
                                {selectedProp ? (
                                    selectedProp.voteOptions && selectedProp.voteOptions.length > 0 ? (
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                                            {selectedProp.voteOptions.map((opt: any) => {
                                                const label = opt.label ?? opt.text ?? opt.name ?? opt.value ?? String(opt.id ?? '');
                                                // Try to map any existing result count for this option when available
                                                const matched = voteResults?.results?.find((r: any) => r.voteOptionId === opt.id || r.voteOptionId === opt.value || r.label === opt.label || r.label === opt.text);
                                                const count = matched ? matched.count : undefined;

                                                return (
                                                    <Box key={opt.id ?? opt.value ?? label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 1, bgcolor: (t) => t.palette.action.hover }}>
                                                        <Typography variant="body2" fontWeight={600}>{label}</Typography>
                                                        <Chip label={typeof count === 'number' ? count : '—'} size="small" color={typeof count === 'number' && count > 0 ? 'primary' : 'default'} />
                                                    </Box>
                                                );
                                             })}
                                        </Box>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">No options defined for the selected proposition</Typography>
                                    )
                                ) : (
                                    <Box>
                                        {openVotation ? (<Typography variant="caption" color="text.secondary">Loading results...</Typography>) : (<Typography variant="caption" color="text.secondary">No active votation</Typography>)}
                                    </Box>
                                )}
                             </Box>

                            <Box>
                                <Button variant="contained" startIcon={<PictureInPictureAltRoundedIcon />} disabled>Show live audience view</Button>
                            </Box>
                        </Box>
                        
                        <Box>
                            {/* Proposition controls moved here so they appear alongside live monitor */}
                            <AdminLivePropositionControls
                                selectedAgenda={selectedAgenda}
                                selectedProposition={selectedProp}
                                 showResults={showResults ?? false}
                                 setShowResults={setShowResults ?? (() => {})}
                                 handleOpenVote={handleOpenVote}
                                 handleCloseVote={handleCloseVote}
                                 handlePrevVote={handlePrevVote}
                                 handleNextVote={handleNextVote}
                                 handleStartReVote={handleStartReVote ?? (() => {})}
                                 isOpeningVote={isOpeningVote}
                                 isClosingVote={isClosingVote}
                                 hasOpenVotation={hasOpenVotation}
                                 isSelectedPropositionOpen={isSelectedPropositionOpen}
                                 voteResults={voteResults}
                             />
                             
                        </Box>

                    </CardContent>
                </Box>

                {/* RIGHT: Meeting overview compact panel inside the same card */}
                <Box sx={{ borderLeft: (t) => `1px solid ${t.palette.divider}`, bgcolor: (t) => t.palette.background.paper }}>
                    <CardHeader title="Meeting overview" sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }} />
                    <Divider />
                    <CardContent sx={{ overflow: 'auto', height: 'calc(100% - 72px)' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Attendance</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Chip label={`Present: ${attendance.present}`} size="small" />
                                    <Chip label={`Registered: ${attendance.registered}`} size="small" />
                                    <Chip label={`Connected: ${participantsConnected}`} size="small" color={participantsConnected > 0 ? 'primary' : 'default'} />
                                </Box>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="body2" color="text.secondary">Selected vote</Typography>
                                <Typography fontWeight={600} sx={{ mt: 0.5 }}>{selectedProp ? selectedProp.question : "—"}</Typography>
                            </Box>

                          

                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Button variant="contained" color="primary" startIcon={<SaveRoundedIcon />} disabled onClick={handleFinalizeResults}>Finalize</Button>
                                <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} disabled>CSV</Button>
                            </Box>

           

                        </Box>
                    </CardContent>
                </Box>
            </Card>
        </Box>
    );
}
