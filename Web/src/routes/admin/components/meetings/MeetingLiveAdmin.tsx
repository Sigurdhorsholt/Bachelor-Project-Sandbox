﻿import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
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
import ManualBallots from "./meetingLiveAdmin/ManualBallots";

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

    // Track applied manual ballots per proposition id in local UI state (demo only)
    // Store detailed per-option counts, notes and total
    const [manualBallotsMap, setManualBallotsMap] = useState<
        Record<string, { counts: Record<string, number>; notes?: string; total: number }>
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

    // Apply manual ballots provided as per-option counts
    const handleApplyManualBallots = (counts: Record<string, number>, notes?: string) => {
        if (!selectedProposition) return;
        const pid = selectedProposition.id;
        const totalCount = Object.values(counts).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
        if (totalCount <= 0) return;

        setManualBallotsMap((prev) => {
            const prevEntry = prev[pid] ?? { counts: {}, notes: "", total: 0 };
            const mergedCounts: Record<string, number> = { ...prevEntry.counts };
            for (const k of Object.keys(counts)) {
                mergedCounts[k] = (mergedCounts[k] ?? 0) + (counts[k] ?? 0);
            }
            return {
                ...prev,
                [pid]: {
                    counts: mergedCounts,
                    notes: notes ?? prevEntry.notes,
                    total: (prevEntry.total ?? 0) + totalCount,
                },
            };
        });

        // Update demo voteProgress: add cast and total so it's visible in the UI
        setVoteProgress((prev) => ({ cast: prev.cast + totalCount, total: prev.total + totalCount }));
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
                <Box className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* LEFT: Voting controls */}
                    <Box>
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


                                {/** 
                                <Box className="mt-5">
                                    <ManualBallots
                                        proposition={selectedProposition}
                                        disabled={!selectedProposition}
                                        onApply={handleApplyManualBallots}
                                    />

                                    {selectedProposition && manualBallotsMap[selectedProposition.id] && (
                                        <Box className="mt-2">
                                            <Typography variant="body2" color="text.secondary">
                                                Applied manual ballots:
                                            </Typography>
                                            <Typography className="mt-1" fontWeight={600}>
                                                {manualBallotsMap[selectedProposition.id].total}
                                            </Typography>
                                            <Box className="mt-1">
                                                {Object.entries(manualBallotsMap[selectedProposition.id].counts).map(([k, v]) => (
                                                    <Typography key={k} variant="body2" color="text.secondary">
                                                        {k}: <strong>{v}</strong>
                                                    </Typography>
                                                ))}
                                                {manualBallotsMap[selectedProposition.id].notes && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Notes: {manualBallotsMap[selectedProposition.id].notes}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                                */}
                                
                                
                            </CardContent>
                        </Card>
                    </Box>

                    {/* MIDDLE: Live monitor */}
                    <Box>
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
                    </Box>

                    {/* RIGHT: Results & minutes */}
                    <Box>
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

                                <Box className="flex flex-wrap gap-1.5 mt-2">
                                    <Box className="w-full sm:w-auto">
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<SaveRoundedIcon />}
                                            disabled
                                            onClick={handleFinalizeResults}
                                        >
                                            Finalize for minutes
                                        </Button>
                                    </Box>
                                    <Box className="w-full sm:w-auto">
                                        <Button
                                            variant="outlined"
                                            startIcon={<FileDownloadRoundedIcon />}
                                            disabled
                                        >
                                            Export CSV
                                        </Button>
                                    </Box>
                                    <Box className="w-full sm:w-auto">
                                        <Button
                                            variant="outlined"
                                            startIcon={<VisibilityRoundedIcon />}
                                            disabled
                                        >
                                            Show audience results
                                        </Button>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

            </Box>
        </Box>
    );
}
