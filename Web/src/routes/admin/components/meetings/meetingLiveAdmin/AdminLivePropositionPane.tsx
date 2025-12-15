import React from "react";
import { Box, Card, CardContent, CardHeader, Chip, Divider, List, ListItem, ListItemButton, ListItemText, Typography } from "@mui/material";
// removed AdminLivePropositionControls import - controls moved to monitor
import type { AgendaItemFull } from "../../../../../domain/agenda.ts";

type Props = {
    selectedAgenda: AgendaItemFull | null;
    selectedProposition: import('../../../../../domain/propositions').PropositionDto | null;
    setSelectedProposition: React.Dispatch<React.SetStateAction<import('../../../../../domain/propositions').PropositionDto | null>>;
    // pane is purely presentational: only selection and agenda are required
};

export function AdminLivePropositionPane({
    selectedAgenda,
    selectedProposition,
    setSelectedProposition,
}: Props) {
    // The pane is presentational and doesn't need other props.

    return (
        <Box sx={{ height: '100%' }}>
            <Card elevation={1} className="rounded-2xl" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                    title={selectedAgenda ? `Propositions — ${selectedAgenda.title}` : 'Propositions'}
                    sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }}
                />
                <Divider />

                <CardContent sx={{ overflow: 'auto', flex: 1 }}>
                    <List disablePadding>
                        {(selectedAgenda?.propositions ?? []).length === 0 && (
                            <ListItem>
                                <ListItemText primary={<Typography color="text.secondary">No propositions in this agenda</Typography>} />
                            </ListItem>
                        )}

                        {(selectedAgenda?.propositions ?? []).map((p: any, pIdx: number) => (
                            <React.Fragment key={p.id}>
                                <ListItem disablePadding>
                                    <ListItemButton
                                        selected={selectedProposition?.id === p.id}
                                        onClick={() => setSelectedProposition(p)}
                                        sx={{
                                            '&.Mui-selected': {
                                                bgcolor: (t) => t.palette.action.selected,
                                                borderLeft: (t) => `3px solid ${t.palette.primary.main}`,
                                                pl: 1.5,
                                                color: (t) => t.palette.text.primary,
                                                boxShadow: 1,
                                            },
                                            py: 2,
                                        }}
                                    >
                                        <ListItemText
                                            primary={<Typography fontWeight={700}>{p.question}</Typography>}
                                            secondary={p.voteType ? (<Typography variant="body2" color="text.secondary">{p.voteType}</Typography>) : undefined}
                                        />
                                        <Box className="ml-2">
                                            {p.voteType && <Chip size="small" label={p.voteType} />}
                                        </Box>
                                    </ListItemButton>
                                </ListItem>

                                {pIdx < (selectedAgenda?.propositions?.length ?? 1) - 1 && (
                                    <Divider component="li" />
                                )}
                            </React.Fragment>
                        ))}
                    </List>
                </CardContent>

                {/* Controls were moved to the Live monitor overview so they appear alongside live content */}

            </Card>
        </Box>
    );
}

export default AdminLivePropositionPane;
