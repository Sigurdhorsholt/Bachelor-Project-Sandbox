// routes/meeting/MeetingDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Container,
    Card,
    CardContent,
    CardHeader,
    Button,
    Box,
    Chip,
    Divider,
    RadioGroup,
    FormControlLabel,
    Radio,
    Skeleton,
    Snackbar,
    Alert,
    ToggleButton,
    ToggleButtonGroup,
    LinearProgress,
    Paper,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import HowToVoteRoundedIcon from "@mui/icons-material/HowToVoteRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";

/** ===== Types (align with your backend) ===== */
type VoteType = "YesNoBlank" | "List";
type Option = { id: string; label: string };
type Proposition = {
    id: string;
    question: string;
    voteType: VoteType;
    options?: Option[];
    isOpen: boolean;
};
type MeetingLivePublic = {
    id: string;
    title: string;
    division?: string;
    status: "Upcoming" | "Live" | "Closed";
    totalEligible?: number;
    totalCast?: number;
    currentProposition?: Proposition | null;
};

/** ===== Replace these two stubs with your RTK Query hooks =====
 * const { data: meeting, isLoading, isError } = useGetMeetingPublicQuery(id)
 * const [castVote, { isLoading: isCasting }] = useCastVoteMutation()
 */
async function fetchPublicMeeting(meetingId: string): Promise<MeetingLivePublic> {
    await new Promise((r) => setTimeout(r, 350));
    return {
        id: meetingId,
        title: "AfdelingsMødet 2.0",
        division: "Budget 2026",
        status: "Live",
        totalEligible: 120,
        totalCast: 47,
        currentProposition: {
            id: "prop-1",
            question: "Skal budgettet vedtages?",
            voteType: "YesNoBlank",
            isOpen: true,
            options: [
                { id: "yes", label: "Ja" },
                { id: "no", label: "Nej" },
                { id: "blank", label: "Blank" },
            ],
        },
    };
}
async function postVote(payload: {
    meetingId: string;
    propositionId: string;
    optionId: string;
}) {
    await new Promise((r) => setTimeout(r, 450));
    return { ok: true };
}
const votedKey = (meetingId: string, propositionId: string) =>
    `voted:${meetingId}:${propositionId}`;

/** ===== Page Component (scaffolding + vote view) ===== */
export const MeetingDashboard: React.FC = () => {
    const { id: meetingId = "" } = useParams();
    const nav = useNavigate();

    const [meeting, setMeeting] = useState<MeetingLivePublic | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [isCasting, setIsCasting] = useState(false);
    const [castError, setCastError] = useState<string | null>(null);
    const [snackOpen, setSnackOpen] = useState(false);

    const [textScale, setTextScale] = useState<"normal" | "large">("normal");
    const [selectedOption, setSelectedOption] = useState("");

    const proposition = meeting?.currentProposition ?? null;

    const alreadyVoted = useMemo(() => {
        if (!meeting || !proposition) return false;
        return !!localStorage.getItem(votedKey(meeting.id, proposition.id));
    }, [meeting, proposition]);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setIsLoading(true);
                const m = await fetchPublicMeeting(meetingId);
                if (!alive) return;
                setMeeting(m);
                setLoadError(null);
            } catch {
                setLoadError("Kunne ikke hente mødet. Prøv igen.");
            } finally {
                setIsLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [meetingId]);

    const submitVote = async () => {
        if (!meeting || !proposition || !selectedOption) return;
        if (alreadyVoted) {
            setCastError("Du har allerede stemt på dette punkt.");
            setSnackOpen(true);
            return;
        }
        setIsCasting(true);
        try {
            await postVote({
                meetingId: meeting.id,
                propositionId: proposition.id,
                optionId: selectedOption,
            });
            localStorage.setItem(votedKey(meeting.id, proposition.id), "1");
            setCastError(null);
            setSnackOpen(true);
        } catch {
            setCastError("Din stemme kunne ikke gemmes. Prøv igen.");
            setSnackOpen(true);
        } finally {
            setIsCasting(false);
        }
    };

    const large = textScale === "large";

    return (
        <Box className="min-h-screen flex flex-col bg-gradient-to-b from-white to-slate-50">
            {/* Sticky top bar (scaffold) */}
            <AppBar position="sticky" color="transparent" elevation={0}>
                <Toolbar className="!px-3 sm:!px-6">
                    <IconButton edge="start" onClick={() => nav(-1)} aria-label="Tilbage">
                        <ArrowBackRoundedIcon />
                    </IconButton>
                    <Typography variant="h6" className="!font-semibold truncate">
                        {meeting?.title ?? "Møde"}
                    </Typography>
                    <Box className="ml-auto flex items-center gap-2">
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={textScale}
                            onChange={(_, v) => v && setTextScale(v)}
                            aria-label="Tekststørrelse"
                        >
                            <ToggleButton value="normal">Aa</ToggleButton>
                            <ToggleButton value="large">A A</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Toolbar>
                {isLoading && <LinearProgress />}
            </AppBar>

            {/* Content */}
            <Container maxWidth="sm" className="grow px-3 sm:px-0 py-4 sm:py-6">
                {/* Meeting meta */}
                <Card elevation={0} className="rounded-2xl border border-slate-100">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                        <Box>
                            <Typography
                                variant={large ? "h6" : "subtitle1"}
                                fontWeight={700}
                                className="truncate"
                                title={meeting?.title}
                            >
                                {meeting?.title ?? <Skeleton width={160} />}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {meeting?.division || "—"}
                            </Typography>
                        </Box>
                        <Chip
                            color={meeting?.status === "Live" ? "success" : "default"}
                            variant="outlined"
                            label={meeting?.status || "—"}
                            size="small"
                        />
                    </CardContent>
                </Card>

                {/* Load error */}
                {loadError && (
                    <Alert className="mt-3" severity="error" icon={<ErrorOutlineRoundedIcon />}>
                        {loadError}
                    </Alert>
                )}

                {/* Proposition card */}
                <Card elevation={1} className="rounded-2xl mt-4">
                    <CardHeader
                        title="Aktuel afstemning"
                        subheader={
                            isLoading
                                ? ""
                                : proposition?.isOpen
                                    ? "Åben for afstemning"
                                    : meeting?.status === "Closed"
                                        ? "Mødet er afsluttet"
                                        : "Ikke åben endnu"
                        }
                        sx={{
                            "& .MuiCardHeader-title": { fontWeight: 700, fontSize: large ? 20 : 18 },
                            "& .MuiCardHeader-subheader": { color: "text.secondary" },
                        }}
                    />
                    <Divider />
                    <CardContent>
                        {isLoading ? (
                            <>
                                <Skeleton height={28} width="90%" />
                                <Skeleton height={24} width="60%" className="mt-2" />
                                <Skeleton height={48} className="mt-4 rounded-xl" />
                                <Skeleton height={48} className="mt-2 rounded-xl" />
                                <Skeleton height={48} className="mt-2 rounded-xl" />
                            </>
                        ) : proposition ? (
                            <>
                                <Typography variant={large ? "h5" : "h6"} fontWeight={800} className="mb-3">
                                    {proposition.question}
                                </Typography>

                                {alreadyVoted && (
                                    <Alert severity="success" icon={<CheckCircleRoundedIcon />} className="mb-3">
                                        Din stemme er modtaget for dette punkt. Tak!
                                    </Alert>
                                )}
                                {!proposition.isOpen && (
                                    <Alert severity="info" className="mb-3">
                                        Afstemningen er ikke åben i øjeblikket.
                                    </Alert>
                                )}

                                <VoteOptions
                                    proposition={proposition}
                                    selected={selectedOption}
                                    setSelected={setSelectedOption}
                                    disabled={!proposition.isOpen || alreadyVoted || isCasting}
                                    large={large}
                                />

                                <Paper
                                    elevation={0}
                                    className="mt-4 p-3 rounded-xl border border-slate-100 bg-slate-50"
                                >
                                    <Box className="flex items-start gap-2">
                                        <HelpOutlineRoundedIcon className="mt-0.5" fontSize="small" />
                                        <Typography variant="body2" color="text.secondary">
                                            Din stemme er anonym. Du kan kun stemme én gang pr. punkt.
                                        </Typography>
                                    </Box>
                                </Paper>
                            </>
                        ) : (
                            <Typography variant="body1" color="text.secondary">
                                Der er ingen aktiv afstemning lige nu.
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </Container>

            {/* Sticky submit bar */}
            <Box
                sx={{
                    position: "sticky",
                    bottom: 0,
                    borderTop: (t) => `1px solid ${t.palette.divider}`,
                    backgroundColor: (t) => t.palette.background.paper,
                    zIndex: 10,
                }}
                className="px-3 py-3"
            >
                <Container maxWidth="sm" className="p-0">
                    <Button
                        fullWidth
                        size={large ? "large" : "medium"}
                        variant="contained"
                        disableElevation
                        startIcon={<HowToVoteRoundedIcon />}
                        disabled={
                            isLoading ||
                            !proposition ||
                            !proposition.isOpen ||
                            alreadyVoted ||
                            !selectedOption ||
                            isCasting
                        }
                        onClick={submitVote}
                    >
                        {alreadyVoted ? "Allerede stemt" : isCasting ? "Afgiver stemme…" : "Afgiv din stemme"}
                    </Button>
                </Container>
            </Box>

            {/* Snack feedback */}
            <Snackbar
                open={snackOpen}
                autoHideDuration={2600}
                onClose={() => setSnackOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                {castError ? (
                    <Alert severity="error" onClose={() => setSnackOpen(false)}>
                        {castError}
                    </Alert>
                ) : (
                    <Alert severity="success" onClose={() => setSnackOpen(false)}>
                        Tak! Din stemme er registreret.
                    </Alert>
                )}
            </Snackbar>
        </Box>
    );
};

/** ===== Options list (MUI + Tailwind, consistent styling) ===== */
function VoteOptions({
                         proposition,
                         selected,
                         setSelected,
                         disabled,
                         large,
                     }: {
    proposition: Proposition;
    selected: string;
    setSelected: (id: string) => void;
    disabled: boolean;
    large: boolean;
}) {
    const opts: Option[] =
        proposition.voteType === "YesNoBlank"
            ? [
                { id: "yes", label: "Ja" },
                { id: "no", label: "Nej" },
                { id: "blank", label: "Blank" },
            ]
            : proposition.options ?? [];

    return (
        <Box className="mt-1">
            <RadioGroup
                value={selected}
                onChange={(e) => setSelected((e.target as HTMLInputElement).value)}
                aria-label="Afstemningsmuligheder"
            >
                {opts.map((opt) => (
                    <FormControlLabel
                        key={opt.id}
                        value={opt.id}
                        control={<Radio />}
                        disabled={disabled}
                        label={
                            <Typography variant={large ? "h6" : "body1"} className="!font-medium">
                                {opt.label}
                            </Typography>
                        }
                        sx={{
                            mx: 0,
                            my: 0.5,
                            px: 1,
                            py: 1,
                            borderRadius: 2,
                            "&:hover": { backgroundColor: "action.hover" },
                        }}
                    />
                ))}
            </RadioGroup>
        </Box>
    );
}
