import React, { useState } from "react";
import {
    Paper, Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip,
    IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useGetMeetingsQuery, useCreateMeetingMutation } from "../../../../Redux/meetingsApi";

export type MeetingStatus = "Draft" | "Scheduled" | "Published" | "Finished";

type MeetingFormData = { 
    title: string; 
    startsAt: string; 
    status: MeetingStatus;
};

type MeetingsTableProps = {
    divisionId: string;
    selectedMeetingId: string;
    onSelectMeeting: (meetingId: string) => void;
};

export default function MeetingsTable({
    divisionId,
    selectedMeetingId,
    onSelectMeeting,
}: MeetingsTableProps) {
    const { data: meetings = [], isFetching: isLoadingMeetings } = useGetMeetingsQuery(divisionId, {
        skip: !divisionId,
    });

    const [createMeeting] = useCreateMeetingMutation();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<MeetingFormData>({
        title: "",
        startsAt: "",
        status: "Draft",
    });

    const formatDateTime = (isoString: string) => new Date(isoString).toLocaleString();

    const canSubmitForm = formData.title.trim().length > 1 && formData.startsAt;
    const canCreateMeeting = !!divisionId;

    const openCreateDialog = () => {
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        if (isSubmitting) return;
        setIsDialogOpen(false);
        setFormData({ title: "", startsAt: "", status: "Draft" });
    };

    const handleCreateMeeting = async () => {
        if (!canSubmitForm || !canCreateMeeting) return;
        
        try {
            setIsSubmitting(true);
            const startsAtUtc = new Date(formData.startsAt).toISOString();
            await createMeeting({
                divisionId,
                title: formData.title.trim(),
                startsAtUtc,
                status: formData.status,
            }).unwrap();
            closeDialog();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper elevation={1} className="rounded-2xl">
            {/* Header */}
            <Box className="p-3 md:p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Typography variant="subtitle1" className="!font-semibold">
                        Møder
                    </Typography>
                    <Tooltip title={canCreateMeeting ? "Tilføj møde" : "Deaktiveret"}>
                        <span>
                            <IconButton 
                                size="small" 
                                onClick={openCreateDialog} 
                                disabled={!canCreateMeeting}
                            >
                                <AddIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="small" variant="outlined" className="!rounded-lg" disabled>
                        Eksporter CSV
                    </Button>
                    <Button size="small" variant="outlined" className="!rounded-lg" disabled>
                        Filter
                    </Button>
                </div>
            </Box>

            {/* Table */}
            <Box className="w-full overflow-x-auto">
                <Table size="small" aria-label="Meetings list" className="min-w-[720px]">
                    <TableHead>
                        <TableRow className="bg-slate-50">
                            <TableCell>Titel</TableCell>
                            <TableCell className="hidden sm:table-cell">Start</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {meetings.map(meeting => (
                            <TableRow
                                key={meeting.id}
                                hover
                                selected={selectedMeetingId === meeting.id}
                                className="cursor-pointer"
                                onClick={() => onSelectMeeting(meeting.id)}
                            >
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{meeting.title}</span>
                                        <span className="sm:hidden text-xs text-slate-500">
                                            {formatDateTime(meeting.startsAtUtc)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    {formatDateTime(meeting.startsAtUtc)}
                                </TableCell>
                                <TableCell>
                                    <Chip size="small" label={meeting.status} variant="outlined" />
                                </TableCell>
                            </TableRow>
                        ))}
                        {meetings.length === 0 && !isLoadingMeetings && (
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Typography variant="body2" className="!text-slate-500 py-4 text-center">
                                        Ingen møder i denne division.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Box>

            {/* Add Meeting Dialog */}
            <Dialog open={isDialogOpen} onClose={closeDialog} fullWidth maxWidth="xs">
                <DialogTitle>Tilføj møde</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: "grid", gap: 2 }}>
                            <TextField
                                label="Titel"
                                fullWidth
                                size="small"
                                variant="outlined"
                                margin="dense"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />

                            <TextField
                                label="Starttid"
                                type="datetime-local"
                                fullWidth
                                size="small"
                                variant="outlined"
                                margin="dense"
                                InputLabelProps={{ shrink: true }}
                                value={formData.startsAt}
                                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                                inputProps={{ placeholder: "ÅÅÅÅ-MM-DDTHH:mm" }}
                            />

                            <TextField
                                select
                                label="Status"
                                fullWidth
                                size="small"
                                variant="outlined"
                                margin="dense"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as MeetingStatus })}
                            >
                                <MenuItem value="Draft">Udkast</MenuItem>
                                <MenuItem value="Scheduled">Planlagt</MenuItem>
                                <MenuItem value="Published">Offentliggjort</MenuItem>
                                <MenuItem value="Finished">Afsluttet</MenuItem>
                            </TextField>
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={closeDialog} disabled={isSubmitting}>
                        Annuller
                    </Button>
                    <Button
                        onClick={handleCreateMeeting}
                        variant="contained"
                        disableElevation
                        disabled={!canSubmitForm || isSubmitting || !canCreateMeeting}
                    >
                        {isSubmitting ? "Opretter…" : "Opret"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
