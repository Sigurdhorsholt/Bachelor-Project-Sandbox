import React, {useMemo, useState} from "react";
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Box,
    Container,
    Drawer,
    Divider,
    List,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Button,
    Tooltip
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ApartmentIcon from "@mui/icons-material/Apartment";
import LogoutIcon from "@mui/icons-material/Logout";
import DomainTreeIcon from "@mui/icons-material/AccountTree";
import EventIcon from "@mui/icons-material/Event";
import {useSelector, useDispatch} from 'react-redux'
import {clearAuth} from "../Redux/auth/authSlice.ts";
import {useNavigate} from "react-router-dom";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LoginIcon from "@mui/icons-material/Login";

// --- Mocked data (replace with your API wiring later) ---
const MOCK = [
    {
        id: "org-1",
        name: "Danish Housing Org",
        divisions: [
            {
                id: "div-1",
                name: "Copenhagen North",
                meetings: [
                    {id: "m-101", title: "Q4 Budget Approval", startsAt: "2025-11-02T18:00:00Z", status: "Scheduled"},
                    {id: "m-102", title: "Board Election", startsAt: "2025-12-01T17:30:00Z", status: "Draft"},
                ],
            },
            {
                id: "div-2",
                name: "Aarhus West",
                meetings: [
                    {id: "m-201", title: "Maintenance Vote", startsAt: "2025-10-25T16:00:00Z", status: "Scheduled"},
                    {
                        id: "m-202",
                        title: "Extraordinary Assembly",
                        startsAt: "2025-10-30T18:30:00Z",
                        status: "Published"
                    },
                ],
            },
        ],
    },
    {
        id: "org-2",
        name: "Urban Blocks Assoc.",
        divisions: [
            {
                id: "div-3",
                name: "Central",
                meetings: [
                    {id: "m-301", title: "Bylaw Update", startsAt: "2025-11-10T19:00:00Z", status: "Draft"},
                ],
            },
        ],
    },
];

function fmtDate(iso: string): string {
    if (!iso) return "—";
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleString();
}

export default function AdminDashboard() {
    // State
    const [mobileOpen, setMobileOpen] = useState(false);
    const [orgId, setOrgId] = useState(MOCK[0]?.id ?? "");
    const org = useMemo(() => MOCK.find(o => o.id === orgId) ?? null, [orgId]);

    const [divisionId, setDivisionId] = useState(org?.divisions?.[0]?.id ?? "");
    // Keep division in sync with org
    React.useEffect(() => {
        if (!org) return;
        const exists = org.divisions.some(d => d.id === divisionId);
        if (!exists) setDivisionId(org.divisions[0]?.id ?? "");
    }, [orgId]);

    const division = useMemo(() => org?.divisions.find(d => d.id === divisionId) ?? null, [org, divisionId]);
    const meetings = division?.meetings ?? [];
    const [selectedMeetingId, setSelectedMeetingId] = useState("");
    const selectedMeeting = useMemo(() => meetings.find(m => m.id === selectedMeetingId) ?? null, [meetings, selectedMeetingId]);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const logOut = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            dispatch(clearAuth());
            navigate("/");
        } catch {
        }
    }

    const handleDrawerToggle = () => setMobileOpen(v => !v);

    // Sidebar content
    const drawer = (
        <Box role="navigation" className="w-[280px] sm:w-[300px] p-3">
            <div className="flex items-center gap-2 px-2 pb-3">
                <ApartmentIcon/>
                <Typography variant="subtitle1" className="!font-semibold">Admin — Live Voting</Typography>
            </div>
            <Divider/>

            <Box className="mt-3 space-y-3">
                <FormControl fullWidth size="small">
                    <InputLabel id="org-label">Organisation</InputLabel>
                    <Select
                        labelId="org-label"
                        label="Organisation"
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                    >
                        {MOCK.map(o => (
                            <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <List
                    dense
                    subheader={
                        <ListSubheader component="div" className="!bg-transparent !pl-0 flex items-center gap-2">
                            <DomainTreeIcon fontSize="small"/> Divisions
                        </ListSubheader>
                    }
                    className="!px-0"
                >
                    {(org?.divisions ?? []).map(d => (
                        <ListItemButton
                            key={d.id}
                            selected={divisionId === d.id}
                            onClick={() => setDivisionId(d.id)}
                            className="rounded-xl"
                        >
                            <ListItemText primary={d.name}/>
                        </ListItemButton>
                    ))}
                </List>
            </Box>

            <Divider className="my-3"/>

            <List
                dense
                subheader={
                    <ListSubheader component="div" className="!bg-transparent !pl-0 flex items-center gap-2">
                        <EventIcon fontSize="small"/> Meetings in division
                    </ListSubheader>
                }
                className="!px-0"
            >
                {meetings.map(m => (
                    <ListItemButton
                        key={m.id}
                        selected={selectedMeetingId === m.id}
                        onClick={() => setSelectedMeetingId(m.id)}
                        className="rounded-xl"
                    >
                        <ListItemText
                            primary={m.title}
                            secondary={fmtDate(m.startsAt)}
                        />
                    </ListItemButton>
                ))}
                {meetings.length === 0 && (
                    <Typography variant="body2" className="!text-slate-500 px-2 py-1">No meetings.</Typography>
                )}
            </List>
        </Box>
    );

    return (
        <Box className="min-h-screen flex flex-col bg-gradient-to-b from-white to-slate-50 text-slate-900">
            {/* Top bar */}
            <AppBar position="static" elevation={0} color="transparent">
                <Toolbar className="!px-3 sm:!px-6">
                    <div className="flex items-center gap-2">
                        <MeetingRoomIcon className="!text-slate-900" />
                        <Typography variant="h6" className="!font-semibold !text-slate-900">
                            Live Voting
                        </Typography>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {/* Logout button */}
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<LogoutIcon />}
                            onClick={logOut}
                            className="hidden sm:flex"
                        >
                            Logout
                        </Button>
                    </div>
                </Toolbar>
            </AppBar>

            <Box className="flex grow">
                {/* Sidebar */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{keepMounted: true}}
                    className="md:!hidden"
                >
                    {drawer}
                </Drawer>
                <Drawer variant="permanent" open className="hidden md:!block">
                    {drawer}
                </Drawer>

                {/* Main content */}
                <Container maxWidth="lg" className="grow py-4 md:py-6">
                    {/* Division context header */}
                    <Box className="mb-3 md:mb-4">
                        <Typography variant="h5" className="!text-xl md:!text-2xl !font-bold">
                            {division ? division.name : "Select a division"}
                        </Typography>
                        <Typography variant="body2" className="!text-slate-500">
                            Organisation: {org?.name ?? "—"}
                        </Typography>
                    </Box>

                    {/* Meetings table (looks good) */}
                    <Paper elevation={1} className="rounded-2xl overflow-hidden">
                        <Box className="p-3 md:p-4 border-b border-slate-100 flex items-center justify-between">
                            <Typography variant="subtitle1" className="!font-semibold">Meetings</Typography>
                            <div className="flex items-center gap-2">
                                <Button size="small" variant="outlined" className="!rounded-lg" disabled>Export
                                    CSV</Button>
                                <Button size="small" variant="outlined" className="!rounded-lg" disabled>Filter</Button>
                            </div>
                        </Box>
                        <Table size="small" aria-label="Meetings list">
                            <TableHead>
                                <TableRow className="bg-slate-50">
                                    <TableCell>Title</TableCell>
                                    <TableCell className="hidden sm:table-cell">Start</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {meetings.map((m) => (
                                    <TableRow key={m.id} hover selected={selectedMeetingId === m.id}
                                              className="cursor-pointer" onClick={() => setSelectedMeetingId(m.id)}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{m.title}</span>
                                                <span
                                                    className="sm:hidden text-xs text-slate-500">{fmtDate(m.startsAt)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{fmtDate(m.startsAt)}</TableCell>
                                        <TableCell>
                                            <Chip size="small" label={m.status} variant="outlined"/>
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="small" variant="text" className="!rounded-lg" disabled>
                                                    Edit
                                                </Button>
                                                <Button size="small" variant="text" className="!rounded-lg" disabled>
                                                    Open
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {meetings.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4}>
                                            <Typography variant="body2" className="!text-slate-500 py-4 text-center">No
                                                meetings in this division.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>

                    {/* Meeting details when selected */}
                    <Box className="mt-4">
                        {selectedMeeting ? (
                            <Paper elevation={0} className="p-4 md:p-5 rounded-2xl border border-slate-100">
                                <Typography variant="h6" className="!font-semibold">{selectedMeeting.title}</Typography>
                                <div
                                    className="mt-1 text-sm text-slate-600">Starts: {fmtDate(selectedMeeting.startsAt)}</div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Chip size="small" label={selectedMeeting.status}/>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button variant="contained" disableElevation className="!rounded-lg" disabled>Open
                                        Meeting</Button>
                                    <Button variant="outlined" className="!rounded-lg" disabled>Manage Agenda</Button>
                                    <Button variant="outlined" className="!rounded-lg" disabled>Results</Button>
                                </div>
                            </Paper>
                        ) : (
                            <Typography variant="body2" className="!text-slate-500">Select a meeting to view
                                details.</Typography>
                        )}
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}


