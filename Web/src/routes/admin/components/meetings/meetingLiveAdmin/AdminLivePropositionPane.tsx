import React from "react";
import { Box, Card, CardContent, CardHeader, Chip, Divider, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material";

import { useGetOpenVotationsByMeetingIdQuery } from "../../../../../Redux/votationApi.ts";
import { AdminLivePropositionControls } from "./AdminLivePropositionControls.tsx";
import type { AgendaItemFull } from "../../../../../domain/agenda.ts";
import type { PropositionDto } from "../../../../../domain/propositions.ts";
import type { MeetingDto } from "../../../../../domain/meetings.ts";

type Props = {
    meetingId: string;
    meeting: MeetingDto;
    selectedAgenda: AgendaItemFull | null;
    selectedProposition: PropositionDto | null;
    setSelectedProposition: React.Dispatch<React.SetStateAction<PropositionDto | null>>;
};

export function AdminLivePropositionPane({
    meetingId,
    meeting,
    selectedAgenda,
    selectedProposition,
    setSelectedProposition,
}: Props) {

    const { data: openVotations = [] } = useGetOpenVotationsByMeetingIdQuery(meetingId);
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
                            // Check if this proposition is currently open for voting (search openVotations)
                            const isOpenForVoting = openVotations?.some(v => v.propositionId === p.id && v.open);
                            
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

                {/* Vote controls - delegated to AdminLivePropositionControls */}
                <AdminLivePropositionControls
                    meetingId={meetingId}
                    meeting={meeting}
                    selectedProposition={selectedProposition}
                />
            </Card>
        </Box>
    );
}

export default AdminLivePropositionPane;
