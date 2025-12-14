import React from "react";
import {
    Paper, Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip,
    IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

// Reuse the SAME union everywhere
export type MeetingStatus = "Draft" | "Scheduled" | "Published" | "Finished";

// Keep this component-local Meeting shape (UI-facing)
export type Meeting = { id: string; title: string; startsAt: string; status: MeetingStatus };

type Props = {
    meetings: Meeting[];
    selectedMeetingId: string;
    onSelectMeeting: (id: string) => void;
    onCreateMeeting?: (meeting: Omit<Meeting, "id">) => Promise<void> | void;
};

export default function MeetingsTable({
                                          meetings, selectedMeetingId, onSelectMeeting, onCreateMeeting,
                                      }: Props) {
    const fmt = (iso: string) => new Date(iso).toLocaleString();

    // --- Dialog state ---
    const [open, setOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [form, setForm] = React.useState<{ title: string; startsAt: string; status: MeetingStatus }>({
        title: "",
        startsAt: "",
        status: "Draft",
    });

    const canSubmit = form.title.trim().length > 1 && form.startsAt;

    function handleOpen() { setOpen(true); }
    function handleClose() {
        if (submitting) return;
        setOpen(false);
        setForm({ title: "", startsAt: "", status: "Draft" });
    }

    async function handleCreate() {
        if (!onCreateMeeting || !canSubmit) return;
        try {
            setSubmitting(true);
            await onCreateMeeting({
                title: form.title.trim(),
                startsAt: form.startsAt,
                status: form.status, // <- now typed as MeetingStatus
            });
            handleClose();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Paper elevation={1} className="rounded-2xl">
            {/* Header */}
            <Box className="p-3 md:p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Typography variant="subtitle1" className="!font-semibold">
                        Møder
                    </Typography>
                    <Tooltip title={onCreateMeeting ? "Tilføj møde" : "Deaktiveret"}>
            <span>
              <IconButton size="small" onClick={handleOpen} disabled={!onCreateMeeting}>
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
                        {meetings.map(m => (
                            <TableRow
                                key={m.id}
                                hover
                                selected={selectedMeetingId === m.id}
                                className="cursor-pointer"
                                onClick={() => onSelectMeeting(m.id)}
                            >
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{m.title}</span>
                                        <span className="sm:hidden text-xs text-slate-500">{fmt(m.startsAt)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{fmt(m.startsAt)}</TableCell>
                                <TableCell><Chip size="small" label={m.status} variant="outlined" /></TableCell>
                             
                            </TableRow>
                        ))}
                        {meetings.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4}>
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
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
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
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />

                            <TextField
                                label="Starttid"
                                type="datetime-local"
                                fullWidth
                                size="small"
                                variant="outlined"
                                margin="dense"
                                InputLabelProps={{ shrink: true }}
                                value={form.startsAt}
                                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                                inputProps={{ placeholder: "ÅÅÅÅ-MM-DDTHH:mm" }}
                            />

                            <TextField
                                select
                                label="Status"
                                fullWidth
                                size="small"
                                variant="outlined"
                                margin="dense"
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value as MeetingStatus })}
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
                    <Button onClick={handleClose} disabled={submitting}>
                        Annuller
                    </Button>
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        disableElevation
                        disabled={!canSubmit || submitting || !onCreateMeeting}
                    >
                        {submitting ? "Opretter…" : "Opret"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
