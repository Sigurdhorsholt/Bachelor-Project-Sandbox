import {
    Paper, Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip,
    IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import React from "react";

export type Meeting = { id: string; title: string; startsAt: string; status: string };

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
    const [form, setForm] = React.useState({
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
            await onCreateMeeting({ title: form.title.trim(), startsAt: form.startsAt, status: form.status });
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
                    <Typography variant="subtitle1" className="!font-semibold">Meetings</Typography>
                    <Tooltip title={onCreateMeeting ? "Add meeting" : "Disabled"}>
            <span>
              <IconButton size="small" onClick={handleOpen} disabled={!onCreateMeeting}>
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
                    </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="small" variant="outlined" className="!rounded-lg" disabled>Export CSV</Button>
                    <Button size="small" variant="outlined" className="!rounded-lg" disabled>Filter</Button>
                </div>
            </Box>

            {/* Table */}
            <Box className="w-full overflow-x-auto">
                <Table size="small" aria-label="Meetings list" className="min-w-[720px]">
                    <TableHead>
                        <TableRow className="bg-slate-50">
                            <TableCell>Title</TableCell>
                            <TableCell className="hidden sm:table-cell">Start</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
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
                                <TableCell align="right">
                                    <div className="flex justify-end gap-2">
                                        <Button size="small" variant="text" className="!rounded-lg" disabled>Edit</Button>
                                        <Button size="small" variant="text" className="!rounded-lg" disabled>Open</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {meetings.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4}>
                                    <Typography variant="body2" className="!text-slate-500 py-4 text-center">
                                        No meetings in this division.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Box>

            {/* Add Meeting Dialog */}
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
                <DialogTitle>Add meeting</DialogTitle>

                <DialogContent>
                    {/* use Stack for consistent spacing */}
                    <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: "grid", gap: 2 }}>
                            <TextField
                                label="Title"
                                fullWidth
                                size="small"
                                variant="outlined"
                                margin="dense"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                            />

                            <TextField
                                label="Start time"
                                type="datetime-local"
                                fullWidth
                                size="small"
                                variant="outlined"
                                margin="dense"
                                InputLabelProps={{ shrink: true }}
                                value={form.startsAt}
                                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                                // optional: prevent weird locale placeholders in some browsers
                                inputProps={{ placeholder: "YYYY-MM-DDTHH:mm" }}
                            />

                            <TextField
                                select
                                label="Status"
                                fullWidth
                                size="small"
                                variant="outlined"
                                margin="dense"
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                            >
                                <MenuItem value="Draft">Draft</MenuItem>
                                <MenuItem value="Scheduled">Scheduled</MenuItem>
                                <MenuItem value="Published">Published</MenuItem>
                            </TextField>
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        disableElevation
                        disabled={!canSubmit || submitting || !onCreateMeeting}
                    >
                        {submitting ? "Creating…" : "Create"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
