import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Divider,
    Grid,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    TextField,
    Typography,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import PictureInPictureAltRoundedIcon from "@mui/icons-material/PictureInPictureAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNewRounded";

import { useGetMeetingFullQuery } from "../../../../Redux/meetingsApi.ts";

export default function MeetingLiveAdmin() {
    const { id } = useParams() as { id?: string };
    const navigate = useNavigate();

    const { data: meeting } = useGetMeetingFullQuery(id ?? "", { skip: !id });

    // Selection state: choose agenda item first, then proposition
    // Default to -1 meaning nothing selected yet — user should explicitly pick an agenda then a proposition
    const [selectedAgendaIndex, setSelectedAgendaIndex] = useState<number>(-1);
    const [selectedPropIndex, setSelectedPropIndex] = useState<number>(-1);

    // prefixed setters are unused placeholders to avoid lint warnings until wired up
    const [attendance, _setAttendance] = useState({ present: 0, registered: 0 });
    const [voteProgress, setVoteProgress] = useState({ cast: 0, total: 0 });

    // Manual ballots input (admin-entered paper ballots) — UI only for now
    const [manualBallotsCount, setManualBallotsCount] = useState<string>("");
    const [manualBallotsNotes, setManualBallotsNotes] = useState<string>("");
    // Track applied manual ballots per proposition id in local UI state (demo only)
    const [manualBallotsMap, setManualBallotsMap] = useState<
        Record<string, { count: number; notes?: string }>
    >({});

    useEffect(() => {
        console.log("meeting full", meeting);
        // Reset selections when meeting changes: require explicit selection
        setSelectedAgendaIndex(-1);
        setSelectedPropIndex(-1);
    }, [meeting]);

    useEffect(() => {
        // TODO: fetch meeting metadata and votes; subscribe to live updates
        // Placeholder: reset progress when meeting id changes
        setVoteProgress({ cast: 0, total: 0 });
    }, [id]);

    const agenda = meeting?.agenda ?? [];
    const selectedAgenda = agenda[selectedAgendaIndex] ?? null;
    const selectedProposition = selectedAgenda?.propositions?.[selectedPropIndex] ?? null;

    const goBack = () => navigate(-1);

    const handleOpenVote = () => {
        // TODO: implement opening a vote (server call / signalR)
    };

    const handleCloseVote = () => {
        // TODO: implement closing a vote (server call /signalR)
    };

    // Navigate propositions within current agenda
    const handleNextVote = () => {
        if (!selectedAgenda) return;
        setSelectedPropIndex((i) =>
            Math.min((selectedAgenda.propositions?.length ?? 1) - 1, i + 1)
        );
    };

    const handlePrevVote = () =>
        setSelectedPropIndex((i) => Math.max(0, i - 1));

    const handleFinalizeResults = () => {
        // TODO: finalize/export results for minutes
    };

    const handleStartReVote = () => {
        // TODO: start a re-vote (allow hybrid paper inputs)
    };

    const handleApplyManualBallots = () => {
        if (!selectedProposition) return;
        const pid = selectedProposition.id;
        const count = Number(manualBallotsCount);
        if (!Number.isFinite(count) || count <= 0) {
            // invalid input — ignore for now
            return;
        }
        setManualBallotsMap((prev) => {
            const prevEntry = prev[pid] ?? { count: 0, notes: "" };
            return {
                ...prev,
                [pid]: {
                    count: prevEntry.count + count,
                    notes: manualBallotsNotes || prevEntry.notes,
                },
            };
        });
        // Update demo voteProgress: add cast and total so it's visible in the UI
        setVoteProgress((prev) => ({ cast: prev.cast + count, total: prev.total + count }));
        // clear inputs
        setManualBallotsCount("");
        setManualBallotsNotes("");
    };

    return (
        <Box
            className="min-h-screen"
            sx={{
                bgcolor: "background.default",
            }}
        >
            {/* Header */}
            <Box
                className="px-4 md:px-6 py-4"
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 5,
                    backdropFilter: "saturate(180%) blur(6px)",
                    bgcolor: (t) => t.palette.background.paper,
                }}
            >
                <Box className="flex items-center justify-between">
                    <Box className="space-y-0.5">
                        <Typography variant="h5" fontWeight={700}>
                            Live: {meeting?.title ?? "—"}
                        </Typography>
                    </Box>

                    <Box className="flex gap-2">
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackRoundedIcon />}
                            onClick={goBack}
                        >
                            Back
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<PowerSettingsNewRoundedIcon />}
                            disabled
                        >
                            End session
                        </Button>
                    </Box>
                </Box>
            </Box>
            <Divider />

            {/* Content */}
            <Box className="px-4 md:px-6 py-6">
                <Grid container spacing={3}>
                    {/* LEFT: Voting controls */}
                    <Grid item xs={12} md={4}>
                        <Card elevation={1} className="rounded-2xl">
                            <CardHeader
                                title="Afstemnings håndtering"
                                sx={{
                                    pb: 1,
                                    "& .MuiCardHeader-title": { fontWeight: 700 },
                                }}
                            />
                            <CardContent className="pt-2">
                                <Typography
                                    variant="overline"
                                    color="text.secondary"
                                    className="tracking-wider"
                                >
                                    Agenda items
                                </Typography>

                                <Card
                                    variant="outlined"
                                    className="rounded-xl mb-3"
                                    sx={{ borderStyle: "dashed" }}
                                >
                                    <List dense disablePadding>
                                        {agenda.map((a, aIdx) => (
                                            <React.Fragment key={a.id}>
                                                <ListItem disablePadding>
                                                    <ListItemButton
                                                        selected={aIdx === selectedAgendaIndex}
                                                        onClick={() => {
                                                            setSelectedAgendaIndex(aIdx);
                                                            setSelectedPropIndex(
                                                                (a.propositions?.length ?? 0) > 0 ? 0 : -1
                                                            );
                                                        }}
                                                        sx={{
                                                            // More prominent selected style: primary.light bg, left accent and shadow
                                                            '&.Mui-selected': {
                                                                bgcolor: (t) => t.palette.primary.light,
                                                                borderLeft: (t) => `4px solid ${t.palette.primary.main}`,
                                                                pl: 1.5,
                                                                color: (t) => t.palette.primary.contrastText,
                                                                boxShadow: 3,
                                                            },
                                                            '&.Mui-selected:hover': {
                                                                bgcolor: (t) => t.palette.primary.light,
                                                            },
                                                        }}
                                                    >
                                                        <ListItemText
                                                            primary={<Typography fontWeight={600}>{a.title}</Typography>}
                                                            secondary={
                                                                a.description ? (
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {a.description}
                                                                    </Typography>
                                                                ) : undefined
                                                            }
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
                                                {aIdx < agenda.length - 1 && <Divider component="li" />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </Card>

                                <Typography
                                    variant="overline"
                                    color="text.secondary"
                                    className="tracking-wider"
                                >
                                    Propositions
                                </Typography>

                                <Card variant="outlined" className="rounded-xl">
                                    <List dense disablePadding>
                                        {(selectedAgenda?.propositions ?? []).map((p, pIdx) => (
                                            <React.Fragment key={p.id}>
                                                <ListItem disablePadding>
                                                    <ListItemButton
                                                        selected={pIdx === selectedPropIndex}
                                                        onClick={() => setSelectedPropIndex(pIdx)}
                                                        sx={{
                                                            '&.Mui-selected': {
                                                                bgcolor: (t) => t.palette.primary.light,
                                                                borderLeft: (t) => `4px solid ${t.palette.primary.main}`,
                                                                pl: 1.5,
                                                                color: (t) => t.palette.primary.contrastText,
                                                                boxShadow: 3,
                                                            },
                                                            '&.Mui-selected:hover': {
                                                                bgcolor: (t) => t.palette.primary.light,
                                                            },
                                                        }}
                                                    >
                                                        <ListItemText
                                                            primary={<Typography fontWeight={600}>{p.question}</Typography>}
                                                            secondary={
                                                                p.voteType ? (
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        {p.voteType}
                                                                    </Typography>
                                                                ) : undefined
                                                            }
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
                                                {pIdx <
                                                    (selectedAgenda?.propositions?.length ?? 1) - 1 && (
                                                        <Divider component="li" />
                                                    )}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </Card>

                                {/* Controls */}
                                <Box className="mt-4 grid grid-cols-2 gap-2">
                                    <Button
                                        variant="contained"
                                        startIcon={<PlayArrowRoundedIcon />}
                                        disabled={!selectedProposition}
                                        onClick={handleOpenVote}
                                    >
                                        Open vote
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<StopRoundedIcon />}
                                        disabled={!selectedProposition}
                                        onClick={handleCloseVote}
                                    >
                                        Close vote
                                    </Button>

                                    <Button
                                        variant="text"
                                        startIcon={<NavigateBeforeRoundedIcon />}
                                        disabled={selectedPropIndex <= 0}
                                        onClick={handlePrevVote}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="text"
                                        endIcon={<NavigateNextRoundedIcon />}
                                        disabled={
                                            selectedPropIndex < 0 ||
                                            selectedPropIndex >=
                                            (selectedAgenda?.propositions?.length ?? 1) - 1
                                        }
                                        onClick={handleNextVote}
                                    >
                                        Next
                                    </Button>
                                </Box>
                                
                                {/* Re-vote */}
                                <Box className="mt-4">
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        fullWidth
                                        startIcon={<ReplayRoundedIcon />}
                                        disabled
                                        onClick={handleStartReVote}
                                    >
                                        Start re-vote
                                    </Button>
                                </Box>

                                {/* Manual ballots */}
                                <Box className="mt-5">
                                    <Typography
                                        variant="overline"
                                        color="text.secondary"
                                        className="tracking-wider"
                                    >
                                        Manual ballots (paper)
                                    </Typography>
                                    <Grid container spacing={1.5}>
                                        <Grid item xs={12}>
                                            <TextField
                                                label="Paper ballots (count)"
                                                type="number"
                                                value={manualBallotsCount}
                                                onChange={(e) => setManualBallotsCount(e.target.value)}
                                                fullWidth
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                label="Notes"
                                                value={manualBallotsNotes}
                                                onChange={(e) => setManualBallotsNotes(e.target.value)}
                                                fullWidth
                                                multiline
                                                rows={3}
                                                size="small"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                disabled={!selectedProposition}
                                                onClick={handleApplyManualBallots}
                                            >
                                                Add manual ballots
                                            </Button>
                                        </Grid>
                                    </Grid>

                                    {selectedProposition &&
                                        manualBallotsMap[selectedProposition.id] && (
                                            <Typography
                                                variant="body2"
                                                className="mt-2"
                                                color="text.secondary"
                                            >
                                                Applied manual ballots:{" "}
                                                <strong>
                                                    {manualBallotsMap[selectedProposition.id].count}
                                                </strong>
                                            </Typography>
                                        )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* MIDDLE: Live monitor */}
                    <Grid item xs={12} md={4}>
                        <Card elevation={1} className="rounded-2xl">
                            <CardHeader
                                title="Live monitor"
                                action={
                                    <Chip
                                        size="small"
                                        color="default"
                                        label="Idle"
                                        variant="outlined"
                                    />
                                }
                                sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }}
                            />
                            <CardContent className="pt-2">
                                <Box className="flex items-center gap-2 mb-2">
                                    <Typography variant="body2" color="text.secondary">
                                        Attendance:
                                    </Typography>
                                    <Chip label={`Present: ${attendance.present}`} size="small" />
                                    <Chip label={`Registered: ${attendance.registered}`} size="small" />
                                </Box>

                                <Divider className="my-2" />

                                <Box className="space-y-1">
                                    <Typography variant="body2" color="text.secondary">
                                        Vote progress:
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800}>
                                        {voteProgress.cast} / {voteProgress.total}
                                    </Typography>
                                </Box>

                                <Box className="mt-4">
                                    <Button
                                        variant="contained"
                                        startIcon={<PictureInPictureAltRoundedIcon />}
                                        disabled
                                    >
                                        Show live audience view
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* RIGHT: Results & minutes */}
                    <Grid item xs={12} md={4}>
                        <Card elevation={1} className="rounded-2xl">
                            <CardHeader
                                title="Results & minutes"
                                sx={{ pb: 1, "& .MuiCardHeader-title": { fontWeight: 700 } }}
                            />
                            <CardContent className="pt-2">
                                <Typography variant="body2" color="text.secondary">
                                    Selected vote:
                                </Typography>
                                <Typography className="mt-1" fontWeight={600}>
                                    {selectedProposition ? selectedProposition.question : "—"}
                                </Typography>

                                <Grid container spacing={1.5} className="mt-2">
                                    <Grid item xs={12} sm="auto">
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<SaveRoundedIcon />}
                                            disabled
                                            onClick={handleFinalizeResults}
                                        >
                                            Finalize for minutes
                                        </Button>
                                    </Grid>
                                    <Grid item xs={12} sm="auto">
                                        <Button
                                            variant="outlined"
                                            startIcon={<FileDownloadRoundedIcon />}
                                            disabled
                                        >
                                            Export CSV
                                        </Button>
                                    </Grid>
                                    <Grid item xs={12} sm="auto">
                                        <Button
                                            variant="outlined"
                                            startIcon={<VisibilityRoundedIcon />}
                                            disabled
                                        >
                                            Show audience results
                                        </Button>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

            </Box>
        </Box>
    );
}
