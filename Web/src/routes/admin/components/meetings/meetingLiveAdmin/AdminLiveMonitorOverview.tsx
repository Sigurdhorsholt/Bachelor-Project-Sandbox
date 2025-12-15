import * as React from "react";
import {type Dispatch, type SetStateAction, useEffect} from "react";
import {Box, Button, CardHeader, CardContent, Divider, Chip, Card, Typography} from "@mui/material";
import PictureInPictureAltRoundedIcon from "@mui/icons-material/PictureInPictureAltRounded";
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import {useGetVotationResultsQuery, type VotationResultsDto} from "../../../../../Redux/votationApi.ts";

import AdminLivePropositionControls from "./AdminLivePropositionControls";
import type {AgendaItemFull} from "../../../../../domain/agenda.ts";
import type {PropositionDto} from "../../../../../domain/propositions.ts";
import type {VoteOptionDto} from "../../../../../domain/voteOptions.ts";
import type {MeetingDto} from "../../../../../domain/meetings.ts";
import type {VotationDto} from "../../../../../Redux/votationApi.ts";


function getVoteOptionLabel(opt: VoteOptionDto): string {
    // Prefer explicit label/text/name/value, fall back to id
    return opt?.label ?? String(opt?.id ?? '');
}
function getVoteOptionCount(opt: VoteOptionDto, voteResults?: VotationResultsDto | null): number | undefined {
    if (!voteResults?.results || !opt) return undefined;

    const matched = voteResults.results.find((r) => {
        return r.voteOptionId === opt.id && r.label === opt.label
    });

    // console.log("option ", opt)
    // console.log("results: ", voteResults.results)
    // console.log("matched: ", matched?.count)
    
    return matched ? matched.count : undefined;
}

type Props = {
    meeting: MeetingDto;
    selectedAgenda?: AgendaItemFull | null;
    selectedProposition?: PropositionDto;
    openVotation?: VotationDto | null;
    handleFinalizeResults: () => void;
    // props for proposition controls
    showResults?: boolean;
    setShowResults?: Dispatch<SetStateAction<boolean>>;
    startVote?: (propositionId: string) => void;
    stopVotation?: (propositionId: string) => void;
    hasOpenVotation?: boolean;
    handleStartReVote?: () => void;
    isOpeningVote?: boolean;
    isClosingVote?: boolean;
};

export default function AdminLiveMonitorOverview({
                                                     meeting,
                                                     selectedAgenda,
                                                     selectedProposition,
                                                     openVotation,
                                                     handleFinalizeResults,
                                                     showResults = false,
                                                     setShowResults,
                                                     startVote,
                                                     stopVotation,
                                                     hasOpenVotation = false,
                                                     handleStartReVote,
                                                     isOpeningVote = false,
                                                     isClosingVote = false
                                                 }: Props) {
    const isSelectedPropositionOpen = !!(openVotation && selectedProposition && openVotation.propositionId === selectedProposition.id);
    const latestVotationId = selectedProposition?.latestVotation?.id;
    const { data: voteResults } = useGetVotationResultsQuery(latestVotationId as string, { skip: !latestVotationId });
    const displayedTotalVotes = voteResults?.totalVotes ?? ((openVotation as any)?.totalVotes ?? 0);

    const handleOpenVote = () => {
        if (!selectedProposition || !startVote) return;
        startVote(selectedProposition.id);
    };

    const handleCloseVote = () => {
        if (!selectedProposition || !stopVotation) return;
        if (openVotation && openVotation.propositionId !== selectedProposition.id) return;
        stopVotation(selectedProposition.id);
    };

    useEffect(() => {
        console.log("voteresult: ", voteResults)
    }, [voteResults]);
    
    return (
        <Box sx={{mt: 3, height: '44vh'}}>
            <Card elevation={1} className="rounded-2xl"
                  sx={{height: '100%', display: 'grid', gridTemplateColumns: {xs: '1fr', md: '3fr 1fr'}}}>
                <Box>
                    <CardHeader
                        title="Live monitor"
                        sx={{pb: 1, "& .MuiCardHeader-title": {fontWeight: 700}}}
                        action={<Chip size="small" label={meeting.started ? 'Live' : 'Idle'} variant="outlined"/>}
                    />
                    <Divider/>
                    <CardContent sx={{overflow: 'auto', height: 'calc(100% - 72px)'}}>
                        <Box sx={{display: 'flex', gap: 3, alignItems: 'flex-start'}}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Vote progress:</Typography>
                                <Typography variant="h6" fontWeight={800}>{displayedTotalVotes} votes
                                    cast</Typography>
                            </Box>

                            <Box sx={{flex: 1}}>
                                {/* Render the proposition's own voteOptions directly (don't rely on external voteResults here) */}
                                {selectedProposition ? (
                                    selectedProposition.voteOptions && selectedProposition.voteOptions.length > 0 ? (
                                        <Box sx={{
                                            display: 'grid',
                                            gridTemplateColumns: {xs: '1fr', sm: 'repeat(3, 1fr)'},
                                            gap: 2
                                        }}>
                                            {selectedProposition.voteOptions.map((opt: VoteOptionDto) => {
                                                const label = getVoteOptionLabel(opt);
                                                // Try to map any existing result count for this option when available
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
                                                         <Typography variant="body2"
                                                                     fontWeight={600}>{label}</Typography>
                                                         <Chip label={count ?? "0"}
                                                               size="small"
                                                               color={ count && count > 0 ? 'primary' : 'default'}/>
                                                     </Box>
                                                 );
                                             })}
                                        </Box>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">No options defined for the
                                            selected proposition</Typography>
                                    )
                                ) : (
                                    <Box>
                                        {openVotation ? (<Typography variant="caption" color="text.secondary">Loading
                                            results...</Typography>) : (
                                            <Typography variant="caption" color="text.secondary">No active
                                                votation</Typography>)}
                                    </Box>
                                )}
                            </Box>

                            <Box>
                                <Button variant="contained" startIcon={<PictureInPictureAltRoundedIcon/>} disabled>
                                    Show live audience view
                                </Button>
                            </Box>
                        </Box>

                        <Box>
                            {/* Proposition controls moved here so they appear alongside live monitor */}
                            <AdminLivePropositionControls
                                selectedAgenda={selectedAgenda ?? null}
                                selectedProposition={selectedProposition}
                                showResults={showResults ?? false}
                                setShowResults={setShowResults ?? (() => {
                                })}
                                handleOpenVote={handleOpenVote}
                                handleCloseVote={handleCloseVote}
                                handleStartReVote={handleStartReVote}
                                isOpeningVote={!!isOpeningVote}
                                isClosingVote={!!isClosingVote}
                                hasOpenVotation={!!hasOpenVotation}
                                isSelectedPropositionOpen={isSelectedPropositionOpen}
                                voteResults={voteResults}
                            />

                        </Box>

                    </CardContent>
                </Box>

                {/* RIGHT: Meeting overview compact panel inside the same card */}
                <Box sx={{
                    borderLeft: (t) => `1px solid ${t.palette.divider}`,
                    bgcolor: (t) => t.palette.background.paper
                }}>
                    <CardHeader title="Meeting overview" sx={{pb: 1, "& .MuiCardHeader-title": {fontWeight: 700}}}/>
                    <Divider/>
                    <CardContent sx={{overflow: 'auto', height: 'calc(100% - 72px)'}}>
                        <Box sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                            <Box>
                                <Typography variant="body2" color="text.secondary">Selected vote</Typography>
                                <Typography fontWeight={600}
                                            sx={{mt: 0.5}}>{selectedProposition ? selectedProposition.question : "—"}</Typography>
                            </Box>


                            <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
                                <Button variant="contained" color="primary" startIcon={<SaveRoundedIcon/>} disabled
                                        onClick={handleFinalizeResults}>Finalize</Button>
                                <Button variant="outlined" startIcon={<FileDownloadRoundedIcon/>} disabled>CSV</Button>
                            </Box>


                        </Box>
                    </CardContent>
                </Box>
            </Card>
        </Box>
    );
}
