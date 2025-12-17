// routes/admin/meetings/MeetingEditor.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

import AccessManager, { type AccessMode, type VerificationCode } from "./AccessManager";
import {
    usePatchMeetingMutation,
    useCreateAgendaItemMutation,
    useUpdateAgendaItemMutation,
    useGetTicketsQuery,
    useGenerateTicketsMutation,
    useClearTicketsMutation,
    useReplaceTicketsMutation,
    useGetMeetingQuery,
    useGetAgendaQuery,
} from "../../../../Redux/meetingsApi";
import AgendaItemCard from "./components/AgendaItemCardAdminView.tsx";

type MeetingStatus = "Draft" | "Scheduled" | "Published" | "Finished";

type MeetingFormData = {
    title: string;
    startsAtLocal: string;
    status: MeetingStatus;
};

type AgendaDialogMode = "add" | "rename";

const padZero = (value: number) => String(value).padStart(2, "0");

const convertIsoToLocalDatetimeInput = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}T${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
};

const extractErrorMessage = (error: any): string => {
    if (!error) return "Unknown error";
    if (typeof error === "string") return error;
    if (error.data) {
        const data = error.data;
        if (typeof data === "string") return data;
        if (data.title) return data.title;
        if (data.error) return String(data.error);
        if (data.errors) {
            try {
                return Object.values(data.errors).flat().join("; ");
            } catch {
                return "Validation error";
            }
        }
    }
    if (error.title) return error.title;
    return JSON.stringify(error);
};

export default function MeetingEditor() {
    const { id: meetingId = "" } = useParams();
    const navigate = useNavigate();

    const { data: meeting, isFetching: isMeetingLoading, isError: isMeetingError } = useGetMeetingQuery(meetingId, { skip: !meetingId });
    const { data: agendaItems = [] } = useGetAgendaQuery(meetingId, { skip: !meetingId });

    const { data: tickets = [], refetch: refetchTickets } = useGetTicketsQuery(meetingId, { skip: !meetingId });
    const [generateTickets] = useGenerateTicketsMutation();
    const [clearTickets] = useClearTicketsMutation();
    const [replaceTickets] = useReplaceTicketsMutation();

    const [formData, setFormData] = useState<MeetingFormData>({
        title: "",
        startsAtLocal: "",
        status: "Draft"
    });

    const [accessMode, setAccessMode] = useState<AccessMode>("qr");
    const [meetingCode, setMeetingCode] = useState<string>("");

    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [patchMeeting] = usePatchMeetingMutation();
    const [createAgendaItem] = useCreateAgendaItemMutation();
    const [updateAgendaItem] = useUpdateAgendaItemMutation();

    const [isAgendaDialogOpen, setIsAgendaDialogOpen] = useState(false);
    const [agendaDialogMode, setAgendaDialogMode] = useState<AgendaDialogMode>("add");
    const [agendaDialogValue, setAgendaDialogValue] = useState("");
    const [agendaDialogTargetId, setAgendaDialogTargetId] = useState<string | null>(null);
    const [isAgendaDialogSubmitting, setIsAgendaDialogSubmitting] = useState(false);

    useEffect(() => {
        if (meeting) {
            setFormData({
                title: meeting.title,
                startsAtLocal: convertIsoToLocalDatetimeInput(meeting.startsAtUtc),
                status: meeting.status as MeetingStatus
            });
        }
    }, [meeting]);

    useEffect(() => {
        if (meeting) {
            setMeetingCode(meeting.meetingCode ?? "");
        }
    }, [meeting]);

    const hasUnsavedChanges = meeting && (
        formData.title !== meeting.title ||
        formData.status !== meeting.status ||
        formData.startsAtLocal !== convertIsoToLocalDatetimeInput(meeting.startsAtUtc)
    );

    const isMeetingLocked = meeting?.status === "Finished";

    const saveMeetingChanges = async () => {
        if (!meeting || !hasUnsavedChanges || isSaving) return;

        const patch: any = {};
        if (formData.title !== meeting.title) {
            patch.title = formData.title.trim();
        }
        if (formData.status !== meeting.status) {
            patch.status = formData.status;
        }
        if (formData.startsAtLocal !== convertIsoToLocalDatetimeInput(meeting.startsAtUtc)) {
            const parsedDate = new Date(formData.startsAtLocal);
            if (!isNaN(parsedDate.getTime())) {
                patch.startsAtUtc = parsedDate.toISOString();
            }
        }

        if (Object.keys(patch).length === 0) return;

        setIsSaving(true);
        setErrorMessage(null);

        try {
            await patchMeeting({ meetingId: meeting.id, patch }).unwrap();
        } catch (error: any) {
            setErrorMessage(extractErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    const resetFormToServerState = () => {
        if (!meeting || isSaving) return;
        setFormData({
            title: meeting.title,
            startsAtLocal: convertIsoToLocalDatetimeInput(meeting.startsAtUtc),
            status: meeting.status as MeetingStatus
        });
        setErrorMessage(null);
    };

    const regenerateMeetingCode = async () => {
        if (!meeting) return;

        setIsSaving(true);
        setErrorMessage(null);

        try {
            const result = await patchMeeting({
                meetingId: meeting.id,
                patch: { regenerateMeetingCode: true }
            }).unwrap();

            if (result?.meetingCode) {
                setMeetingCode(result.meetingCode);
            }
        } catch (error: any) {
            setErrorMessage(extractErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    const openAddAgendaItemDialog = () => {
        if (!meeting || isMeetingLocked) return;
        setAgendaDialogMode("add");
        setAgendaDialogValue("");
        setAgendaDialogTargetId(null);
        setIsAgendaDialogOpen(true);
    };

    const openRenameAgendaItemDialog = async (itemId: string, currentTitle: string) => {
        if (!meeting || isMeetingLocked) return;
        setAgendaDialogMode("rename");
        setAgendaDialogValue(currentTitle ?? "");
        setAgendaDialogTargetId(itemId);
        setIsAgendaDialogOpen(true);
    };

    const handleAgendaDialogConfirm = async () => {
        if (!meeting) return;

        const trimmedTitle = agendaDialogValue?.trim();
        if (!trimmedTitle) return;

        setIsAgendaDialogSubmitting(true);

        try {
            if (agendaDialogMode === "add") {
                await createAgendaItem({ meetingId: meeting.id, title: trimmedTitle }).unwrap();
            } else if (agendaDialogMode === "rename" && agendaDialogTargetId) {
                await updateAgendaItem({
                    meetingId: meeting.id,
                    itemId: agendaDialogTargetId,
                    title: trimmedTitle
                }).unwrap();
            }
            setIsAgendaDialogOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsAgendaDialogSubmitting(false);
        }
    };

    const closeAgendaDialog = () => {
        if (isAgendaDialogSubmitting) return;
        setIsAgendaDialogOpen(false);
    };

    const handleGenerateTickets = async (count: number) => {
        if (!meeting) return;
        try {
            await generateTickets({ meetingId: meeting.id, count }).unwrap();
        } catch (error) {
            console.error("Failed to generate tickets", error);
        } finally {
            try {
                await refetchTickets?.();
            } catch {}
        }
    };

    const handleClearTickets = async () => {
        if (!meeting) return;
        try {
            await clearTickets(meeting.id).unwrap();
        } catch (error) {
            console.error("Failed to clear tickets", error);
        } finally {
            try {
                await refetchTickets?.();
            } catch {}
        }
    };

    const handleReplaceTickets = async (count: number) => {
        if (!meeting) return;
        try {
            await replaceTickets({ meetingId: meeting.id, count }).unwrap();
        } catch (error) {
            console.error("Failed to replace tickets", error);
        } finally {
            try {
                await refetchTickets?.();
            } catch {}
        }
    };

    const exportTicketsToCsv = () => {
        if (!meeting) return;

        const csvHeader = "code,used,issuedTo\n";
        const csvRows = tickets.map((ticket: VerificationCode) =>
            `${ticket.code},${ticket.used ? "yes" : "no"},${ticket.issuedTo ?? ""}`
        ).join("\n");

        const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8" });
        const anchor = document.createElement("a");
        anchor.href = URL.createObjectURL(blob);
        anchor.download = `meeting-${meeting.id}-codes.csv`;
        anchor.click();
        URL.revokeObjectURL(anchor.href);
    };

    if (!meetingId) {
        return (
            <Container maxWidth="lg" className="py-6">
                <Typography>Missing meeting id.</Typography>
            </Container>
        );
    }

    if (isMeetingLoading && !meeting) {
        return (
            <Container maxWidth="lg" className="py-6">
                <Typography>Loading…</Typography>
            </Container>
        );
    }

    if (isMeetingError || !meeting) {
        return (
            <Container maxWidth="lg" className="py-6">
                <Typography>Meeting not found.</Typography>
            </Container>
        );
    }

    return (
        <Box className="min-h-screen flex flex-col">
            <Container maxWidth="lg" className="py-4 md:py-6">
                <div className="flex items-center gap-2 mb-3">
                    <IconButton onClick={() => navigate(-1)} aria-label="Tilbage">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h5" className="!font-bold">Rediger møde</Typography>
                    <span className="ml-auto text-sm text-slate-500">ID: {meeting.id}</span>
                </div>

                <Paper className="p-4 md:p-5 rounded-2xl border border-slate-100 mb-4" elevation={0}>
                    <Typography variant="subtitle1" className="!font-semibold mb-3">Detaljer</Typography>
                    <div className="grid md:grid-cols-3 gap-3">
                        <TextField
                            label="Titel"
                            size="small"
                            variant="outlined"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            disabled={isMeetingLocked || isSaving}
                        />
                        <TextField
                            label="Starttid"
                            type="datetime-local"
                            size="small"
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            value={formData.startsAtLocal}
                            onChange={(e) => setFormData(prev => ({ ...prev, startsAtLocal: e.target.value }))}
                            disabled={isMeetingLocked || isSaving}
                        />
                        <TextField
                            select
                            label="Status"
                            size="small"
                            variant="outlined"
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as MeetingStatus }))}
                            disabled={isSaving}
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
                            onClick={saveMeetingChanges}
                            disabled={!hasUnsavedChanges || isSaving || isMeetingLocked}
                        >
                            {isSaving ? "Gemmer…" : "Gem ændringer"}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={resetFormToServerState}
                            disabled={!hasUnsavedChanges || isSaving}
                        >
                            Nulstil
                        </Button>
                        {hasUnsavedChanges && !isMeetingLocked && (
                            <span className="text-xs text-amber-600 flex items-center">Usave'de ændringer</span>
                        )}
                    </div>
                    {errorMessage && (
                        <Typography variant="body2" className="!text-red-600 mt-2">{errorMessage}</Typography>
                    )}
                    {isMeetingLocked && (
                        <Typography variant="body2" className="!text-red-600 mt-2">
                            Dette møde er afsluttet og kan ikke redigeres.
                        </Typography>
                    )}
                </Paper>

                <AccessManager
                    meetingId={meeting.id}
                    meetingCode={meetingCode}
                    onRegenerateMeetingCode={regenerateMeetingCode}
                    accessMode={accessMode}
                    onChangeAccessMode={setAccessMode}
                    codes={tickets}
                    onGenerateCodes={handleGenerateTickets}
                    onClearCodes={handleClearTickets}
                    onReplaceCodes={handleReplaceTickets}
                    onExportCodes={exportTicketsToCsv}
                    locked={isMeetingLocked}
                />

                <Paper className="p-4 md:p-5 rounded-2xl border border-slate-100" elevation={0}>
                    <div className="flex items-center justify-between">
                        <Typography variant="subtitle1" className="!font-semibold">Dagsorden</Typography>
                        <Tooltip title={isMeetingLocked ? "Mødet er afsluttet" : "Tilføj dagsordenspunkt"}>
                            <span>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="outlined"
                                    size="small"
                                    className="!rounded-lg"
                                    onClick={openAddAgendaItemDialog}
                                    disabled={isMeetingLocked}
                                >
                                    Tilføj punkt
                                </Button>
                            </span>
                        </Tooltip>
                    </div>

                    <Divider className="my-3" />

                    {agendaItems && (
                        <div className="space-y-2">
                            {agendaItems.map((item, index) => (
                                <AgendaItemCard
                                    key={item.id}
                                    meetingId={meeting.id}
                                    itemId={item.id}
                                    index={index}
                                    title={item.title}
                                    description={item.description}
                                    locked={isMeetingLocked}
                                    onRequestRename={openRenameAgendaItemDialog}
                                />
                            ))}
                            {agendaItems.length === 0 && (
                                <Typography variant="body2" className="!text-slate-500">
                                    Ingen dagsordenspunkter endnu.
                                </Typography>
                            )}
                        </div>
                    )}
                </Paper>

                <Dialog open={isAgendaDialogOpen} onClose={closeAgendaDialog} fullWidth maxWidth="sm">
                    <DialogTitle>
                        {agendaDialogMode === "add" ? "Tilføj dagsordenspunkt" : "Ændr titel"}
                    </DialogTitle>
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
                        <Button onClick={closeAgendaDialog} disabled={isAgendaDialogSubmitting}>
                            Annuller
                        </Button>
                        <Button
                            onClick={handleAgendaDialogConfirm}
                            disabled={isAgendaDialogSubmitting || !(agendaDialogValue?.trim())}
                            variant="contained"
                        >
                            {isAgendaDialogSubmitting
                                ? (agendaDialogMode === "add" ? "Opretter…" : "Opdaterer…")
                                : (agendaDialogMode === "add" ? "Opret" : "Gem")
                            }
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
}
