// routes/admin/meetings/MeetingEditor.tsx
import React from "react";
import {useParams, useNavigate} from "react-router-dom";
import {
    Box, Container, Paper, Typography, TextField, MenuItem, Button, Divider, IconButton, Tooltip
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import AccessManager, {type AccessMode, type VerificationCode} from "./AccessManager";

// ---- Temporary in-memory store (replace with RTK Query later) ----
type AgendaItem = { id: string; title: string; propositions: { id: string; title: string }[] };

type Meeting = {
    id: string;
    title: string;
    startsAt: string; // ISO
    status: "Draft" | "Scheduled" | "Published" | "Finished";
    agenda: AgendaItem[];
};

// simulate fetched meeting (replace with useGetMeetingQuery(id))
function useMockMeeting(id: string) {
    const [state, setState] = React.useState<Meeting | null>(null);

    React.useEffect(() => {
        // seed example
        setState({
            id,
            title: "Board Election",
            startsAt: new Date().toISOString(),
            status: "Draft",
            agenda: [
                {id: "a1", title: "Approve Agenda", propositions: []},
                {id: "a2", title: "Elect Board", propositions: [{id: "p1", title: "Candidate A vs B"}]},
            ],
        });
    }, [id]);

    return {
        meeting: state,
        update(patch: Partial<Meeting>) {
            setState((m) => (m ? {...m, ...patch} : m));
            // TODO: PATCH /api/meetings/:id  (persist partial meeting changes)
        },
        setAgenda(updater: (old: AgendaItem[]) => AgendaItem[]) {
            setState((m) => (m ? {...m, agenda: updater(m.agenda)} : m));
            // TODO: PUT /api/meetings/:id/agenda  (persist full agenda order/content)
        },
    };
}

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d = new Date()) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// simple client-side generators (replace with server-side later)
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeMeetingCode = () =>
    Array.from({length: 6}, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join("");
const makeVerificationCode = () =>
    Array.from({length: 8}, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join("");

export default function MeetingEditor() {
    const {id = ""} = useParams();
    const {meeting, update, setAgenda} = useMockMeeting(id);
    const navigate = useNavigate();

    // ---- Access state (replace with backend later) ----
    const [accessMode, setAccessMode] = React.useState<AccessMode>("qr");
    const [meetingCode, setMeetingCode] = React.useState<string>(makeMeetingCode());
    const [codes, setCodes] = React.useState<VerificationCode[]>([]);

    // TODO: GET /api/meetings/:id/access  (load meetingCode + accessMode + counts)
    // React.useEffect(() => { ...load and setAccessMode/meetingCode... }, [id]);

    // TODO: GET /api/meetings/:id/codes  (initial list of verification codes)
    // React.useEffect(() => { ...setCodes(fetchedCodes) }, [id]);

    if (!meeting) {
        return (
            <Container maxWidth="lg" className="py-6">
                <Typography>Loading…</Typography>
            </Container>
        );
    }

    const isLocked = meeting.status === "Finished";

    // Agenda actions (local; replace with mutations later)
    function addAgenda() {
        const id = crypto.randomUUID();
        setAgenda((ag) => [...ag, {id, title: `New item ${ag.length + 1}`, propositions: []}]);
        // TODO: POST /api/meetings/:id/agenda  (create item)
    }

    function renameAgenda(itemId: string) {
        const title = prompt("New title?")?.trim();
        if (!title) return;
        setAgenda((ag) => ag.map(a => (a.id === itemId ? {...a, title} : a)));
        // TODO: PATCH /api/meetings/:id/agenda/:itemId  (rename item)
    }

    function removeAgenda(itemId: string) {
        setAgenda((ag) => ag.filter(a => a.id !== itemId));
        // TODO: DELETE /api/meetings/:id/agenda/:itemId  (remove item)
    }

    function addProposition(itemId: string) {
        const title = prompt("Proposition title?")?.trim();
        if (!title) return;
        setAgenda((ag) =>
            ag.map(a => a.id === itemId
                ? {...a, propositions: [...a.propositions, {id: crypto.randomUUID(), title}]}
                : a)
        );
        // TODO: POST /api/meetings/:id/agenda/:itemId/propositions  (create proposition)
    }

    // AccessManager handlers (local; replace later)
    function regenerateMeetingCode() {
        const next = makeMeetingCode();
        setMeetingCode(next);
        // TODO: PUT /api/meetings/:id/access  (update meetingCode)
    }

    function handleChangeAccessMode(mode: AccessMode) {
        setAccessMode(mode);
        // TODO: PUT /api/meetings/:id/access  (update accessMode)
    }

    function handleGenerateCodes(n: number) {
        const newOnes: VerificationCode[] = Array.from({length: n}).map(() => ({
            id: crypto.randomUUID(),
            code: makeVerificationCode(),
            used: false,
            issuedTo: null,
        }));
        setCodes(prev => [...newOnes, ...prev]);
        // TODO: POST /api/meetings/:id/codes?count=n  (server generates & returns codes)
    }

    function exportCsv() {
        // Client-side CSV (you can swap to a server endpoint later)
        // TODO: (Optional) POST /api/meetings/:id/codes/export  (return CSV stream)
        const header = "code,used,issuedTo\n";
        const rows = codes.map(c => `${c.code},${c.used ? "yes" : "no"},${c.issuedTo ?? ""}`).join("\n");
        const blob = new Blob([header + rows], {type: "text/csv;charset=utf-8"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `meeting-${meeting?.id}-codes.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    return (
        <Box className="min-h-screen flex flex-col">
            <Container maxWidth="lg" className="py-4 md:py-6">
                <div className="flex items-center gap-2 mb-3">
                    <IconButton onClick={() => navigate(-1)} aria-label="Back">
                        <ArrowBackIcon/>
                    </IconButton>
                    <Typography variant="h5" className="!font-bold">Edit Meeting</Typography>
                    <span className="ml-auto text-sm text-slate-500">ID: {meeting.id}</span>
                </div>

                {/* Details */}
                <Paper className="p-4 md:p-5 rounded-2xl border border-slate-100 mb-4" elevation={0}>
                    <Typography variant="subtitle1" className="!font-semibold mb-3">Details</Typography>
                    <div className="grid md:grid-cols-3 gap-3">
                        <TextField
                            label="Title"
                            size="small"
                            variant="outlined"
                            value={meeting.title}
                            onChange={(e) => update({title: e.target.value})}
                            disabled={isLocked}
                        />
                        <TextField
                            label="Start time"
                            type="datetime-local"
                            size="small"
                            variant="outlined"
                            InputLabelProps={{shrink: true}}
                            value={toLocalInput(new Date(meeting.startsAt))}
                            onChange={(e) => update({startsAt: new Date(e.target.value).toISOString()})}
                            disabled={isLocked}
                        />
                        <TextField
                            select
                            label="Status"
                            size="small"
                            variant="outlined"
                            value={meeting.status}
                            onChange={(e) => update({status: e.target.value as Meeting["status"]})}
                        >
                            <MenuItem value="Draft">Draft</MenuItem>
                            <MenuItem value="Scheduled">Scheduled</MenuItem>
                            <MenuItem value="Published">Published</MenuItem>
                            <MenuItem value="Finished">Finished</MenuItem>
                        </TextField>
                    </div>

                    {isLocked && (
                        <Typography variant="body2" className="!text-red-600 mt-2">
                            This meeting is finished and cannot be edited.
                        </Typography>
                    )}
                </Paper>

                {/* Manage meeting access (NEW) */}
                <AccessManager
                    meetingId={meeting.id}
                    meetingCode={meetingCode}
                    onRegenerateMeetingCode={regenerateMeetingCode}     // TODO: PUT /api/meetings/:id/access (meetingCode)
                    accessMode={accessMode}
                    onChangeAccessMode={handleChangeAccessMode}         // TODO: PUT /api/meetings/:id/access (accessMode)
                    codes={codes}
                    onGenerateCodes={handleGenerateCodes}               // TODO: POST /api/meetings/:id/codes?count=n
                    onExportCodes={exportCsv}                           // TODO: (optional) server CSV export
                    locked={isLocked}
                />

                {/* Agenda */}
                <Paper className="p-4 md:p-5 rounded-2xl border border-slate-100" elevation={0}>
                    <div className="flex items-center justify-between">
                        <Typography variant="subtitle1" className="!font-semibold">Agenda</Typography>
                        <Tooltip title={isLocked ? "Meeting is finished" : "Add agenda item"}>
              <span>
                <Button
                    startIcon={<AddIcon/>}
                    variant="outlined"
                    size="small"
                    className="!rounded-lg"
                    onClick={addAgenda}
                    disabled={isLocked}
                >
                  Add item
                </Button>
              </span>
                        </Tooltip>
                    </div>

                    <Divider className="my-3"/>

                    <div className="space-y-2">
                        {meeting.agenda.map((a, i) => (
                            <Paper key={a.id} className="p-3 rounded-xl border border-slate-200" elevation={0}>
                                <div className="flex items-center gap-2">
                                    <Typography className="!font-medium">{i + 1}. {a.title}</Typography>
                                    <div className="ml-auto flex items-center gap-1">
                                        <Tooltip title="Edit title">
                      <span>
                        <IconButton size="small" onClick={() => renameAgenda(a.id)} disabled={isLocked}>
                          <EditIcon fontSize="small"/>
                        </IconButton>
                      </span>
                                        </Tooltip>
                                        <Tooltip title="Remove">
                      <span>
                        <IconButton size="small" onClick={() => removeAgenda(a.id)} disabled={isLocked}>
                          <DeleteIcon fontSize="small"/>
                        </IconButton>
                      </span>
                                        </Tooltip>
                                    </div>
                                </div>

                                <div className="mt-2 text-sm text-slate-600">
                                    Propositions: {a.propositions.length}
                                </div>
                                <div className="mt-2">
                                    <Button
                                        size="small"
                                        variant="text"
                                        startIcon={<AddIcon/>}
                                        onClick={() => addProposition(a.id)}
                                        disabled={isLocked}
                                    >
                                        Add proposition
                                    </Button>
                                </div>
                            </Paper>
                        ))}

                        {meeting.agenda.length === 0 && (
                            <Typography variant="body2" className="!text-slate-500">
                                No agenda items yet.
                            </Typography>
                        )}

                    </div>
                </Paper>
            </Container>
        </Box>
    );
}
