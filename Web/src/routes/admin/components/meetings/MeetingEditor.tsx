// routes/admin/meetings/MeetingEditor.tsx
import React from "react";
import {useParams, useNavigate} from "react-router-dom";
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    MenuItem,
    Button,
    Divider,
    IconButton,
    Tooltip
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import AccessManager, {type AccessMode, type VerificationCode} from "./AccessManager";
import {
    useGetMeetingFullQuery,
    usePatchMeetingMutation,
    useCreateAgendaItemMutation,
    useUpdateAgendaItemMutation,
    useDeleteAgendaItemMutation,
    useCreatePropositionMutation
} from "../../../../Redux/meetingsApi"; // fixed relative path
import type {MeetingFullDto} from "../../../../domain/meetings";

// Local temporary AccessManager state (will be replaced later)
type TempCode = VerificationCode;

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeMeetingCode = () => Array.from({length: 6}, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join("");
const makeVerificationCode = () => Array.from({length: 8}, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join("");

export default function MeetingEditor() {
    const {id = ""} = useParams();
    const navigate = useNavigate();

    // Fetch full meeting (agenda + propositions)
    const {data: meeting, isFetching, isError, refetch} = useGetMeetingFullQuery(id, {skip: !id});
    // Draft form state for delayed save
    const [draft, setDraft] = React.useState<{ title: string; startsAtLocal: string; status: string }>({
        title: "",
        startsAtLocal: "",
        status: "Draft"
    });
    React.useEffect(() => {
        if (meeting) {
            setDraft({title: meeting.title, startsAtLocal: toLocalInput(meeting.startsAtUtc), status: meeting.status});
        }
    }, [meeting]);
    // Local access state (still temporary)
    const [accessMode, setAccessMode] = React.useState<AccessMode>("qr");
    const [meetingCode, setMeetingCode] = React.useState<string>(makeMeetingCode());
    const [codes, setCodes] = React.useState<TempCode[]>([]);
    // Track saving state
    const [saving, setSaving] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    // Helper dirty check
    const isDirty = meeting && (
        draft.title !== meeting.title ||
        draft.status !== meeting.status ||
        draft.startsAtLocal !== toLocalInput(meeting.startsAtUtc)
    );

    // Mutations
    const [patchMeeting] = usePatchMeetingMutation();
    const [createAgendaItem] = useCreateAgendaItemMutation();
    const [updateAgendaItem] = useUpdateAgendaItemMutation();
    const [deleteAgendaItem] = useDeleteAgendaItemMutation();
    const [createProposition] = useCreatePropositionMutation();

    // Error handling utility
    function asErrorText(err: any): string {
        if (!err) return "Unknown error";
        if (typeof err === "string") return err;
        if (err.data) {
            const d = err.data;
            if (typeof d === "string") return d;
            if (d.title) return d.title;
            if (d.error) return String(d.error);
            if (d.errors) {
                try {
                    return Object.values(d.errors).flat().join("; ");
                } catch { /* ignore */
                }
            }
        }
        if (err.title) return err.title;
        return JSON.stringify(err);
    }

    // Handlers for meeting field updates
    async function handleSave() {
        if (!meeting || !isDirty || saving) return;
        const patch: any = {};
        if (draft.title !== meeting.title) patch.title = draft.title.trim();
        if (draft.status !== meeting.status) patch.status = draft.status;
        if (draft.startsAtLocal !== toLocalInput(meeting.startsAtUtc)) {
            const dt = new Date(draft.startsAtLocal);
            if (!isNaN(dt.getTime())) patch.startsAtUtc = dt.toISOString();
        }
        if (Object.keys(patch).length === 0) return; // nothing to save
        setSaving(true);
        setErrorMsg(null);
        try {
            await patchMeeting({meetingId: meeting.id, patch}).unwrap();
            await refetch(); // refresh full meeting
        } catch (e: any) {
            setErrorMsg(asErrorText(e));
        } finally {
            setSaving(false);
        }
    }

    function handleReset() {
        if (!meeting || saving) return;
        setDraft({title: meeting.title, startsAtLocal: toLocalInput(meeting.startsAtUtc), status: meeting.status});
        setErrorMsg(null);
    }

    const isLocked = meeting?.status === "Finished";

    // Agenda operations
    async function addAgenda() {
        if (!meeting || isLocked) return;
        await createAgendaItem({
            meetingId: meeting.id,
            title: `New item ${(meeting.agenda.length) + 1}`
        }).unwrap().catch(() => {
        });
        refetch();
    }

    async function renameAgenda(itemId: string) {
        if (!meeting || isLocked) return;
        const title = prompt("New title?")?.trim();
        if (!title) return;
        await updateAgendaItem({meetingId: meeting.id, itemId, title}).unwrap().catch(() => {
        });
        refetch();
    }

    async function removeAgenda(itemId: string) {
        if (!meeting || isLocked) return;
        if (!confirm("Remove agenda item?")) return;
        await deleteAgendaItem({meetingId: meeting.id, itemId}).unwrap().catch(() => {
        });
        refetch();
    }

    async function addProposition(itemId: string) {
        if (!meeting || isLocked) return;
        const question = prompt("Proposition question?")?.trim();
        if (!question) return;
        await createProposition({
            meetingId: meeting.id,
            itemId,
            question,
            voteType: "YesNoBlank"
        }).unwrap().catch(() => {
        });
        refetch();
    }

    // AccessManager placeholder handlers
    function regenerateMeetingCode() {
        setMeetingCode(makeMeetingCode());
    }

    function handleChangeAccessMode(mode: AccessMode) {
        setAccessMode(mode);
    }

    function handleGenerateCodes(n: number) {
        const newOnes: TempCode[] = Array.from({length: n}).map(() => ({
            id: crypto.randomUUID(),
            code: makeVerificationCode(),
            used: false,
            issuedTo: null,
        }));
        setCodes(prev => [...newOnes, ...prev]);
    }

    function exportCsv() {
        if (!meeting) return;
        const header = "code,used,issuedTo\n";
        const rows = codes.map(c => `${c.code},${c.used ? "yes" : "no"},${c.issuedTo ?? ""}`).join("\n");
        const blob = new Blob([header + rows], {type: "text/csv;charset=utf-8"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `meeting-${meeting.id}-codes.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    if (!id) {
        return
        (
            <Container maxWidth="lg" className="py-6">
                <Typography>
                    Missing meeting id.
                </Typography>
            </Container>
        );
    }

    if (isFetching && !meeting) {
        return (
            <Container maxWidth="lg" className="py-6">
                <Typography>
                    Loading…
                </Typography>
            </Container>
        );
    }

    if (isError || !meeting) {
        return (
            <Container maxWidth="lg" className="py-6">
                <Typography>
                    Meeting not found.
                </Typography>
            </Container>
        );
    }

    return (
        <Box className="min-h-screen flex flex-col">
            <Container maxWidth="lg" className="py-4 md:py-6">
                <div className="flex items-center gap-2 mb-3">
                    <IconButton onClick={() => navigate(-1)} aria-label="Back"><ArrowBackIcon/></IconButton>
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
                            value={draft.title}
                            onChange={(e) => setDraft(d => ({...d, title: e.target.value}))}
                            disabled={isLocked || saving}
                        />
                        <TextField
                            label="Start time"
                            type="datetime-local"
                            size="small"
                            variant="outlined"
                            InputLabelProps={{shrink: true}}
                            value={draft.startsAtLocal}
                            onChange={(e) => setDraft(d => ({...d, startsAtLocal: e.target.value}))}
                            disabled={isLocked || saving}
                        />
                        <TextField
                            select
                            label="Status"
                            size="small"
                            variant="outlined"
                            value={draft.status}
                            onChange={(e) => setDraft(d => ({...d, status: e.target.value}))}
                            disabled={saving}
                        >
                            <MenuItem value="Draft">Draft</MenuItem>
                            <MenuItem value="Scheduled">Scheduled</MenuItem>
                            <MenuItem value="Published">Published</MenuItem>
                            <MenuItem value="Finished">Finished</MenuItem>
                        </TextField>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <Button
                            variant="contained"
                            size="small"
                            disableElevation
                            onClick={handleSave}
                            disabled={!isDirty || saving || isLocked}
                        >{saving ? "Saving…" : "Save changes"}</Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleReset}
                            disabled={!isDirty || saving}
                        >Reset</Button>
                        {isDirty && !isLocked && (
                            <span className="text-xs text-amber-600 flex items-center">Unsaved changes</span>
                        )}
                    </div>
                    {errorMsg && <Typography variant="body2" className="!text-red-600 mt-2">{errorMsg}</Typography>}
                    {isLocked &&
                        <Typography variant="body2" className="!text-red-600 mt-2">This meeting is finished and cannot
                            be edited.</Typography>}
                </Paper>

                {/* AccessManager (still local) */}
                <AccessManager
                    meetingId={meeting.id}
                    meetingCode={meetingCode}
                    onRegenerateMeetingCode={regenerateMeetingCode}
                    accessMode={accessMode}
                    onChangeAccessMode={handleChangeAccessMode}
                    codes={codes}
                    onGenerateCodes={handleGenerateCodes}
                    onExportCodes={exportCsv}
                    locked={isLocked}
                />

                {/* Agenda */}
                <Paper className="p-4 md:p-5 rounded-2xl border border-slate-100" elevation={0}>
                    <div className="flex items-center justify-between">
                        <Typography variant="subtitle1" className="!font-semibold">Agenda</Typography>
                        <Tooltip title={isLocked ? "Meeting is finished" : "Add agenda item"}>
              <span>
                <Button startIcon={<AddIcon/>} variant="outlined" size="small" className="!rounded-lg"
                        onClick={addAgenda} disabled={isLocked}>Add item</Button>
              </span>
                        </Tooltip>
                    </div>
                    <Divider className="my-3"/>
                    <div className="space-y-2">
                        {meeting.agenda.map((a: MeetingFullDto['agenda'][number], i) => (
                            <Paper key={a.id} className="p-3 rounded-xl border border-slate-200" elevation={0}>
                                <div className="flex items-center gap-2">
                                    <Typography className="!font-medium">{i + 1}. {a.title}</Typography>
                                    <div className="ml-auto flex items-center gap-1">
                                        <Tooltip title="Edit title"><span><IconButton size="small"
                                                                                      onClick={() => renameAgenda(a.id)}
                                                                                      disabled={isLocked}><EditIcon
                                            fontSize="small"/></IconButton></span></Tooltip>
                                        <Tooltip title="Remove"><span><IconButton size="small"
                                                                                  onClick={() => removeAgenda(a.id)}
                                                                                  disabled={isLocked}><DeleteIcon
                                            fontSize="small"/></IconButton></span></Tooltip>
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-slate-600">Propositions: {a.propositions.length}</div>
                                <div className="mt-2">
                                    <Button size="small" variant="text" startIcon={<AddIcon/>}
                                            onClick={() => addProposition(a.id)} disabled={isLocked}>Add
                                        proposition</Button>
                                </div>
                            </Paper>
                        ))}
                        {meeting.agenda.length === 0 &&
                            <Typography variant="body2" className="!text-slate-500">No agenda items yet.</Typography>}
                    </div>
                </Paper>
            </Container>
        </Box>
    );
}
