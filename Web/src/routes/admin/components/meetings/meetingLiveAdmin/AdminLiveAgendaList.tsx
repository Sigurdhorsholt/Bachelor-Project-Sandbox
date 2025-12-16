import React from "react";
import { Card, CardContent, CardHeader, Divider, List, ListItem, ListItemButton, ListItemText, Typography, Box, Chip } from "@mui/material";
import type { AgendaItemFull } from "../../../../../domain/agenda.ts";

type Props = {
    agenda: AgendaItemFull[];
    selectedAgenda: AgendaItemFull | null;
    onSelectAgenda: (agenda: AgendaItemFull) => void;
    openVotationPropositionId?: string;
};

export function AdminLiveAgendaList({ agenda, selectedAgenda, onSelectAgenda, openVotationPropositionId }: Props) {
    return (
        <Box sx={{ height: '100%' }}>
            <Card elevation={1} className="rounded-2xl" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                    title="Agenda items"
                    sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }}
                />
                <Divider />
                <CardContent sx={{ p: 0, overflow: 'auto' }}>
                    <List disablePadding>
                        {agenda.map((a: any, aIdx: number) => {
                            // Check if this agenda item contains a proposition that is currently open for voting
                            const hasOpenVoting = openVotationPropositionId && 
                                a.propositions?.some((p: any) => p.id === openVotationPropositionId);
                            
                            return (
                                <React.Fragment key={a.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            selected={selectedAgenda?.id === a.id}
                                            onClick={() => onSelectAgenda(a)}
                                            sx={{
                                                // Highlight if contains open voting
                                                ...(hasOpenVoting && {
                                                    bgcolor: (t) => t.palette.success.light,
                                                    borderLeft: (t) => `4px solid ${t.palette.success.main}`,
                                                    pl: 1.5,
                                                    '&:hover': {
                                                        bgcolor: (t) => t.palette.success.light,
                                                    },
                                                }),
                                                '&.Mui-selected': {
                                                    bgcolor: (t) => hasOpenVoting ? t.palette.success.light : t.palette.primary.light,
                                                    borderLeft: (t) => hasOpenVoting 
                                                        ? `4px solid ${t.palette.success.main}` 
                                                        : `4px solid ${t.palette.primary.main}`,
                                                    pl: 1.5,
                                                    color: (t) => t.palette.primary.contrastText,
                                                    boxShadow: 3,
                                                },
                                                py: 1.25,
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography fontWeight={600}>{a.title}</Typography>
                                                        {hasOpenVoting && (
                                                            <Chip 
                                                                size="small" 
                                                                label="ACTIVE" 
                                                                color="success" 
                                                                sx={{ fontWeight: 700 }}
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={a.description ? (<Typography variant="body2" color="text.secondary">{a.description}</Typography>) : undefined}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                    {aIdx < agenda.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            );
                        })}
                    </List>
                </CardContent>
            </Card>
        </Box>
    );
}

export default AdminLiveAgendaList;
