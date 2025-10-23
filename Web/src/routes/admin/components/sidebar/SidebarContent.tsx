import {
    Box, Divider, Typography, FormControl, InputLabel, Select, MenuItem,
    List, ListSubheader, ListItemButton, ListItemText,
    IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
    DialogActions, Button, TextField
} from "@mui/material";
import ApartmentIcon from "@mui/icons-material/Apartment";
import DomainTreeIcon from "@mui/icons-material/AccountTree";
import EventIcon from "@mui/icons-material/Event";
import AddIcon from "@mui/icons-material/Add";
import {useState} from "react";

export type Meeting = { id: string; title: string; startsAt: string; status: string };
export type Org = { id: string; name: string; divisions: { id: string; name: string; meetings: Meeting[] }[] };

type SidebarContentProps = {
    orgs: Org[];
    orgId: string;
    onChangeOrg: (id: string) => void;

    divisions: { id: string; name: string; meetings: Meeting[] }[];
    divisionId: string;
    onChangeDivision: (id: string) => void;

    meetings: Meeting[];
    selectedMeetingId: string;
    onSelectMeeting: (id: string) => void;

    onCreateDivision?: (name: string) => Promise<void> | void; // NEW
    width?: number;
};

export default function SidebarContent({
                                           orgs, orgId, onChangeOrg,
                                           divisions, divisionId, onChangeDivision,
                                           meetings, selectedMeetingId, onSelectMeeting,
                                           onCreateDivision, width = 300
                                       }: SidebarContentProps) {

    // --- Add Division dialog state ---
    const [open, setOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const canSubmit = newName.trim().length > 1;

    const handleAddClick = () => setOpen(true);
    const handleClose = () => { if (!submitting) { setOpen(false); setNewName(""); } };

    async function handleCreate() {
        if (!canSubmit || !onCreateDivision) return;
        try {
            setSubmitting(true);
            await onCreateDivision(newName.trim());
            setOpen(false);
            setNewName("");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Box role="navigation" sx={{ width, p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, pb: 1.5 }}>
                <ApartmentIcon />
                <Typography variant="subtitle1" fontWeight={600}>Admin — Live Voting</Typography>
            </Box>

            <Divider />

            <Box sx={{ mt: 2 }}>
                <FormControl fullWidth size="small">
                    <InputLabel id="org-label">Organisation</InputLabel>
                    <Select
                        labelId="org-label"
                        label="Organisation"
                        value={orgId}
                        onChange={(e) => onChangeOrg(String(e.target.value))}
                    >
                        {orgs.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <List
                    dense
                    subheader={
                        <ListSubheader component="div"
                                       sx={{ bgcolor: "transparent", pl: 0, display: "flex", alignItems: "center", gap: 1, mt: 1, pr: 0 }}
                        >
                            <DomainTreeIcon fontSize="small" />
                            <span style={{ flex: 1 }}>Afdelinger</span>
                            <Tooltip title={onCreateDivision ? "Tilføj afdeling" : "Deaktiveret"}>
                <span>
                  <IconButton
                      size="small"
                      onClick={handleAddClick}
                      disabled={!onCreateDivision}
                      aria-label="Tilføj afdeling"
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
                            </Tooltip>
                        </ListSubheader>
                    }
                    sx={{ px: 0 }}
                >
                    {divisions.map(d => (
                        <ListItemButton
                            key={d.id}
                            selected={divisionId === d.id}
                            onClick={() => onChangeDivision(d.id)}
                            sx={{ borderRadius: 2 }}
                        >
                            <ListItemText primary={d.name} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>

            <Divider sx={{ my: 2 }} />

            <List
                dense
                subheader={
                    <ListSubheader component="div"
                                   sx={{ bgcolor: "transparent", pl: 0, display: "flex", alignItems: "center", gap: 1 }}
                    >
                        <EventIcon fontSize="small" /> Møder i Afdeling
                    </ListSubheader>
                }
                sx={{ px: 0 }}
            >
                {meetings.map(m => (
                    <ListItemButton
                        key={m.id}
                        selected={selectedMeetingId === m.id}
                        onClick={() => onSelectMeeting(m.id)}
                        sx={{ borderRadius: 2 }}
                    >
                        <ListItemText primary={m.title} secondary={new Date(m.startsAt).toLocaleString()} />
                    </ListItemButton>
                ))}
                {meetings.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                        Ingen møder.
                    </Typography>
                )}
            </List>

            {/* Add Division Dialog */}
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
                <DialogTitle>Tilføj afdeling</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Afdelingsnavn"
                        fullWidth
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={submitting}>Annuller</Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!canSubmit || submitting || !onCreateDivision}
                        variant="contained"
                    >
                        {submitting ? "Tilføjer…" : "Tilføj"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
