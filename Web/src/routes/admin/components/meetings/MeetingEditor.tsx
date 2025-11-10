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
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";

import AccessManager, {type AccessMode, type VerificationCode} from "./AccessManager";
import {
    useGetMeetingFullQuery,
    usePatchMeetingMutation,
    useCreateAgendaItemMutation,
    useUpdateAgendaItemMutation,
    useGetTicketsQuery,
    useGenerateTicketsMutation,
    useClearTicketsMutation,
    useReplaceTicketsMutation,
} from "../../../../Redux/meetingsApi"; // fixed relative path
import AgendaItemCard from "./components/AgendaItemCardAdminView.tsx";


const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function MeetingEditor() {
    const {id = ""} = useParams();
    const navigate = useNavigate();

    // Fetch full meeting (agenda + propositions)
    const {data: meeting, isFetching, isError, refetch} = useGetMeetingFullQuery(id, {skip: !id});

    // Tickets from server
    const { data: tickets, refetch: refetchTickets } = useGetTicketsQuery(id, { skip: !id });
    const [generateTickets] = useGenerateTicketsMutation();
    const [clearTickets] = useClearTicketsMutation();
    const [replaceTickets] = useReplaceTicketsMutation();

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
    const [meetingCode, setMeetingCode] = React.useState<string>("");
    // tickets comes from server; default to empty array for convenience
    const serverCodes = tickets ?? [] as VerificationCode[];
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

    // When meeting loads/changes, sync meetingCode from server
    React.useEffect(() => {
        if (meeting) setMeetingCode(meeting.meetingCode ?? "");
    }, [meeting]);

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

    // Locked flag used by UI to prevent edits when meeting status is Finished
    const isLocked = meeting?.status === "Finished";

    // Agenda operations
    // Dialog state used for both creating and renaming agenda items
    const [agendaDialogOpen, setAgendaDialogOpen] = React.useState(false);
    const [agendaDialogMode, setAgendaDialogMode] = React.useState<"add" | "rename">("add");
    const [agendaDialogValue, setAgendaDialogValue] = React.useState("");
    const [agendaDialogTargetId, setAgendaDialogTargetId] = React.useState<string | null>(null);
    const [agendaDialogSubmitting, setAgendaDialogSubmitting] = React.useState(false);

    function openAddAgendaDialog() {
        if (!meeting || isLocked) return;
        setAgendaDialogMode("add");
        setAgendaDialogValue("");
        setAgendaDialogTargetId(null);
        setAgendaDialogOpen(true);
    }

    async function openRenameAgendaDialog(itemId: string, currentTitle: string) {
        if (!meeting || isLocked) return;
        setAgendaDialogMode("rename");
        setAgendaDialogValue(currentTitle ?? "");
        setAgendaDialogTargetId(itemId);
        setAgendaDialogOpen(true);
    }

    async function handleAgendaDialogConfirm() {
        if (!meeting) return;
        const title = agendaDialogValue?.trim();
        if (!title) return; // don't allow empty
        setAgendaDialogSubmitting(true);
        try {
            if (agendaDialogMode === "add") {
                await createAgendaItem({ meetingId: meeting.id, title }).unwrap();
            } else if (agendaDialogMode === "rename" && agendaDialogTargetId) {
                await updateAgendaItem({ meetingId: meeting.id, itemId: agendaDialogTargetId, title }).unwrap();
            }
            await refetch();
            setAgendaDialogOpen(false);
        } catch (e) {
            // ignore errors here; the top-level error handling will show messages elsewhere
            console.error(e);
        } finally {
            setAgendaDialogSubmitting(false);
        }
    }

    function handleAgendaDialogClose() {
        if (agendaDialogSubmitting) return;
        setAgendaDialogOpen(false);
    }

    // Regenerate meeting code by calling backend (persisted only if server returns success)
    async function regenerateMeetingCode() {
        if (!meeting) return;
        setSaving(true);
        setErrorMsg(null);
        try {
            const res = await patchMeeting({ meetingId: meeting.id, patch: { regenerateMeetingCode: true } }).unwrap();
            // res includes meetingCode via transformResponse; update local state and refresh data
            if (res?.meetingCode) setMeetingCode(res.meetingCode);
            await refetch();
        } catch (e: any) {
            setErrorMsg((e && e.data) ? (e.data as any) : (e.message ?? "Failed to regenerate code"));
        } finally {
            setSaving(false);
        }
    }

    function handleChangeAccessMode(mode: AccessMode) {
        setAccessMode(mode);
    }

    async function handleGenerateCodes(n: number) {
        if (!meeting) return;
        try {
            await generateTickets({ meetingId: meeting.id, count: n }).unwrap();
        } catch (e) {
            console.error("Failed to generate tickets", e);
        } finally {
            try { await refetchTickets?.(); } catch { }
        }
    }

    async function handleClearCodes() {
        if (!meeting) return;
        try {
            await clearTickets(meeting.id).unwrap();
        } catch (e) {
            console.error("Failed to clear tickets", e);
        } finally {
            try { await refetchTickets?.(); } catch { }
        }
    }

    async function handleReplaceCodes(n: number) {
        if (!meeting) return;
        try {
            await replaceTickets({ meetingId: meeting.id, count: n }).unwrap();
        } catch (e) {
            console.error("Failed to replace tickets", e);
        } finally {
            try { await refetchTickets?.(); } catch { }
        }
    }

    function exportCsv() {
        if (!meeting) return;
        const list = serverCodes;
        const header = "code,used,issuedTo\n";
        const rows = list.map((c: VerificationCode) => `${c.code},${c.used ? "yes" : "no"},${c.issuedTo ?? ""}`).join("\n");
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
                    <IconButton onClick={() => navigate(-1)} aria-label="Tilbage"><ArrowBackIcon/></IconButton>
                    <Typography variant="h5" className="!font-bold">Rediger møde</Typography>
                    <span className="ml-auto text-sm text-slate-500">ID: {meeting.id}</span>
                </div>

                {/* Details */}
                <Paper className="p-4 md:p-5 rounded-2xl border border-slate-100 mb-4" elevation={0}>
                    <Typography variant="subtitle1" className="!font-semibold mb-3">Detaljer</Typography>
                    <div className="grid md:grid-cols-3 gap-3">
                        <TextField
                            label="Titel"
                            size="small"
                            variant="outlined"
                            value={draft.title}
                            onChange={(e) => setDraft(d => ({...d, title: e.target.value}))}
                            disabled={isLocked || saving}
                        />
                        <TextField
                            label="Starttid"
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
                            <MenuItem value="Draft">Udkast</MenuItem>
                            <MenuItem value="Scheduled">Planlagt</MenuItem>
                            <MenuItem value="Published">Offentliggjort</MenuItem>
                            <MenuItem value="Finished">Afsluttet</MenuItem>
                        </TextField>
                    </div>
                    <div className="mt-3 flex gap-2">
                        <Button
                            variant="contained"
                            size="small"
                            disableElevation
                            onClick={handleSave}
                            disabled={!isDirty || saving || isLocked}
                        >{saving ? "Gemmer…" : "Gem ændringer"}</Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleReset}
                            disabled={!isDirty || saving}
                        >Nulstil</Button>
                        {isDirty && !isLocked && (
                            <span className="text-xs text-amber-600 flex items-center">Usave'de ændringer</span>
                        )}
                    </div>
                    {errorMsg && <Typography variant="body2" className="!text-red-600 mt-2">{errorMsg}</Typography>}
                    {isLocked &&
                        <Typography variant="body2" className="!text-red-600 mt-2">Dette møde er afsluttet og kan ikke
                            redigeres.</Typography>}
                </Paper>

                {/* AccessManager (still local) */}
                <AccessManager
                    meetingId={meeting.id}
                    meetingCode={meetingCode}
                    onRegenerateMeetingCode={regenerateMeetingCode}
                    accessMode={accessMode}
                    onChangeAccessMode={handleChangeAccessMode}
                    codes={serverCodes}
                    onGenerateCodes={handleGenerateCodes}
                    onClearCodes={handleClearCodes}
                    onReplaceCodes={handleReplaceCodes}
                    onExportCodes={exportCsv}
                    locked={isLocked}
                />

                {/* Agenda */}
                <Paper className="p-4 md:p-5 rounded-2xl border border-slate-100" elevation={0}>
                    <div className="flex items-center justify-between">
                        <Typography variant="subtitle1" className="!font-semibold">Dagsorden</Typography>
                        <Tooltip title={isLocked ? "Mødet er afsluttet" : "Tilføj dagsordenspunkt"}>
                      <span>
                        <Button
                            startIcon={<AddIcon/>}
                            variant="outlined"
                            size="small"
                            className="!rounded-lg"
                            onClick={openAddAgendaDialog}
                            disabled={isLocked}
                        >
                          Tilføj punkt
                        </Button>
                      </span>
                        </Tooltip>
                    </div>

                    <Divider className="my-3"/>

                    <div className="space-y-2">
                        {meeting.agenda.map((a, i) => (
                            <AgendaItemCard
                                key={a.id}
                                meetingId={meeting.id}
                                itemId={a.id}
                                index={i}
                                title={a.title}
                                description={a.description}
                                locked={isLocked}
                                onRequestRename={openRenameAgendaDialog}
                            />
                        ))}
                        {meeting.agenda.length === 0 && (
                            <Typography variant="body2" className="!text-slate-500">
                                Ingen dagsordenspunkter endnu.
                            </Typography>
                        )}
                    </div>
                </Paper>

                {/* Agenda add / rename dialog */}
                <Dialog open={agendaDialogOpen} onClose={handleAgendaDialogClose} fullWidth maxWidth="sm">
                    <DialogTitle>{agendaDialogMode === "add" ? "Tilføj dagsordenspunkt" : "Ændr titel"}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label={agendaDialogMode === "add" ? "Punkt titel" : "Ny titel"}
                            fullWidth
                            value={agendaDialogValue}
                            onChange={(e) => setAgendaDialogValue(e.target.value)}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleAgendaDialogClose} disabled={agendaDialogSubmitting}>Annuller</Button>
                        <Button onClick={handleAgendaDialogConfirm} disabled={agendaDialogSubmitting || !(agendaDialogValue?.trim())} variant="contained">
                            {agendaDialogSubmitting ? (agendaDialogMode === "add" ? "Opretter…" : "Opdaterer…") : (agendaDialogMode === "add" ? "Opret" : "Gem")}
                        </Button>
                    </DialogActions>
                </Dialog>


            </Container>
        </Box>
    );
}
