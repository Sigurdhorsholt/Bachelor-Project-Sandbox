import React from "react";
import { Box, Button, CardHeader, CardContent, Divider, Chip, Card, Typography } from "@mui/material";
import PictureInPictureAltRoundedIcon from "@mui/icons-material/PictureInPictureAltRounded";
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';

import { useGetVotationResultsQuery, useGetOpenVotationsByMeetingIdQuery } from "../../../../../Redux/votationApi.ts";
import { useGetMeetingQuery, useGetAgendaWithPropositionsQuery } from "../../../../../Redux/meetingsApi.ts";
import ManualBallots from "./ManualBallots.tsx";
import type { VoteOptionDto } from "../../../../../domain/voteOptions.ts";
import type { VotationResultsDto } from "../../../../../Redux/votationApi.ts";

type Props = {
    meetingId: string;
    selectedPropositionId?: string;
    selectedAgendaId?: string;
};
export default function AdminLiveMonitorOverview({
    meetingId,
    selectedPropositionId,
    selectedAgendaId,
}: Props) {
    const { data: meeting } = useGetMeetingQuery(meetingId);
    const { data: openVotations = [] } = useGetOpenVotationsByMeetingIdQuery(meetingId);
    const { data: agendaList = [] } = useGetAgendaWithPropositionsQuery(meetingId);
    
    const openVotation = openVotations.find(v => v.meetingId === meetingId);

    // Find selected proposition from agenda data
    const selectedProposition = selectedAgendaId && selectedPropositionId
        ? agendaList.find((a: any) => a.id === selectedAgendaId)?.propositions?.find((p: any) => p.id === selectedPropositionId)
        : null;
    
    const latestVotationId = selectedProposition?.latestVotation?.id;
    const { data: voteResults } = useGetVotationResultsQuery(latestVotationId as string, { skip: !latestVotationId });

    const displayedTotalVotes = voteResults?.totalVotes ?? 0;

    const handleFinalizeResults = () => {
        console.log("Finalize results (stub)");
        // TODO: Implement finalization logic
    };

    const handleExportCSV = () => {
        console.log("Export CSV (stub)");
        // TODO: Implement CSV export
    };

    function getVoteOptionLabel(opt: VoteOptionDto): string {
        return opt?.label ?? String(opt?.id ?? '');
    }

    function getVoteOptionCount(opt: VoteOptionDto, results?: VotationResultsDto): number {
        if (!results?.results || !opt) return 0;
        const matched = results.results.find((r) => r.voteOptionId === opt.id && r.label === opt.label);
        return matched ? matched.count : 0;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Manual Ballots Section */}
            <ManualBallots
                proposition={selectedProposition || null}
                votationId={latestVotationId || null}
                disabled={!openVotation || !voteResults?.open}
                onApply={() => console.log("Manual ballots applied")}
            />

            {/* Existing Monitor Card */}
            <Card elevation={1} className="rounded-2xl" sx={{ flex: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1fr' } }}>
                {/* LEFT: Live monitor */}
                <Box>
                    <CardHeader
                        title="Live monitor"
                        sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }}
                        action={<Chip size="small" label={meeting?.started ? 'Live' : 'Idle'} variant="outlined" color={meeting?.started ? 'success' : 'default'} />}
                    />
                    <Divider />
                    <CardContent sx={{ overflow: 'auto', height: 'calc(100% - 72px)' }}>
                        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Vote progress:</Typography>
                                <Typography variant="h6" fontWeight={800}>{displayedTotalVotes} votes cast</Typography>
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                {selectedProposition && selectedProposition.voteOptions && selectedProposition.voteOptions.length > 0 ? (
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                                        {selectedProposition.voteOptions.map((opt: VoteOptionDto) => {
                                            const label = getVoteOptionLabel(opt);
                                            const count = getVoteOptionCount(opt, voteResults);

                                            return (
                                                <Box key={label} sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    p: 2,
                                                    borderRadius: 1,
                                                    bgcolor: (t) => t.palette.action.hover
                                                }}>
                                                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                                                    <Chip 
                                                        label={count} 
                                                        size="small" 
                                                        color={count > 0 ? 'primary' : 'default'} 
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                ) : (
                                    <Typography variant="caption" color="text.secondary">
                                        {selectedProposition ? "No options defined for this proposition" : "Select a proposition to view live results"}
                                    </Typography>
                                )}
                            </Box>

                            <Box>
                                <Button variant="contained" startIcon={<PictureInPictureAltRoundedIcon />} disabled>
                                    Show live audience view
                                </Button>
                            </Box>
                        </Box>

                        {/* Results preview section */}
                        {voteResults && voteResults.results && voteResults.results.length > 0 && (
                            <Box sx={{ mt: 3, p: 2, borderRadius: 1, bgcolor: (t) => t.palette.background.default }}>
                                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Detailed Results</Typography>
                                <Divider sx={{ mb: 1 }} />
                                {voteResults.results.map((r: any) => (
                                    <Box key={r.voteOptionId} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                                        <Typography variant="body2">{r.label}</Typography>
                                        <Chip size="small" label={`${r.count} votes`} color={r.count > 0 ? 'primary' : 'default'} />
                                    </Box>
                                ))}
                                <Divider sx={{ my: 1 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                                    <Typography variant="body2" fontWeight={700}>Total:</Typography>
                                    <Typography variant="body2" fontWeight={700}>{voteResults.totalVotes} votes</Typography>
                                </Box>
                            </Box>
                        )}
                    </CardContent>
                </Box>

                {/* RIGHT: Meeting overview panel */}
                <Box sx={{ borderLeft: (t) => `1px solid ${t.palette.divider}`, bgcolor: (t) => t.palette.background.paper }}>
                    <CardHeader title="Meeting overview" sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }} />
                    <Divider />
                    <CardContent sx={{ overflow: 'auto', height: 'calc(100% - 72px)' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Meeting</Typography>
                                <Typography fontWeight={600} sx={{ mt: 0.5 }}>{meeting?.title ?? "—"}</Typography>
                            </Box>

                            <Box>
                                <Typography variant="body2" color="text.secondary">Selected vote</Typography>
                                <Typography fontWeight={600} sx={{ mt: 0.5 }}>
                                    {selectedProposition ? (selectedProposition as any).question : "—"}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="body2" color="text.secondary">Status</Typography>
                                <Chip 
                                    size="small" 
                                    label={openVotation ? 'Voting open' : voteResults && !voteResults.open ? 'Results available' : 'No active vote'}
                                    color={openVotation ? 'success' : 'default'}
                                    sx={{ mt: 0.5 }}
                                />
                            </Box>

                            <Divider sx={{ my: 1 }} />

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    startIcon={<SaveRoundedIcon />} 
                                    disabled
                                    onClick={handleFinalizeResults}
                                    fullWidth
                                >
                                    Finalize
                                </Button>
                                <Button 
                                    variant="outlined" 
                                    startIcon={<FileDownloadRoundedIcon />} 
                                    disabled
                                    onClick={handleExportCSV}
                                    fullWidth
                                >
                                    Export CSV
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Box>
            </Card>
        </Box>
    );
}
