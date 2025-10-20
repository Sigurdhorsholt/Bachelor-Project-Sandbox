import React, { useMemo, useState, useEffect } from "react";
import { Box, Container } from "@mui/material";
import TopBar from "./components/TopBar";
import MeetingsTable from "./components/meetings/MeetingsTable";
import MeetingDetails from "./components/meetings/MeetingDetails";
import { clearAuth } from "../../Redux/auth/authSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import SidebarContent from "./components/sidebar/SidebarContent.tsx";

export default function AdminDashboard() {
    // === Mock Data (replace later with API) ===
    const MOCK = [
        {
            id: "org-1",
            name: "Danish Housing Org",
            divisions: [
                {
                    id: "div-1",
                    name: "Copenhagen North",
                    meetings: [
                        { id: "m-101", title: "Q4 Budget Approval", startsAt: "2025-11-02T18:00:00Z", status: "Scheduled" },
                        { id: "m-102", title: "Board Election", startsAt: "2025-12-01T17:30:00Z", status: "Draft" },
                    ],
                },
                {
                    id: "div-2",
                    name: "Aarhus West",
                    meetings: [
                        { id: "m-201", title: "Maintenance Vote", startsAt: "2025-10-25T16:00:00Z", status: "Scheduled" },
                        {
                            id: "m-202",
                            title: "Extraordinary Assembly",
                            startsAt: "2025-10-30T18:30:00Z",
                            status: "Published",
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
                        { id: "m-301", title: "Bylaw Update", startsAt: "2025-11-10T19:00:00Z", status: "Draft" },
                    ],
                },
            ],
        },
    ];

    // === State & Selection ===
    const [orgId, setOrgId] = useState(MOCK[0]?.id ?? "");
    const org = useMemo(() => MOCK.find((o) => o.id === orgId) ?? null, [orgId]);

    const [divisionId, setDivisionId] = useState(org?.divisions?.[0]?.id ?? "");
    useEffect(() => {
        if (!org) return;
        if (!org.divisions.some((d) => d.id === divisionId)) {
            setDivisionId(org.divisions[0]?.id ?? "");
        }
    }, [orgId]);

    const division = useMemo(() => org?.divisions.find((d) => d.id === divisionId) ?? null, [org, divisionId]);
    const meetings = division?.meetings ?? [];

    const [selectedMeetingId, setSelectedMeetingId] = useState("");
    const selectedMeeting = useMemo(
        () => meetings.find((m) => m.id === selectedMeetingId) ?? null,
        [meetings, selectedMeetingId]
    );

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const logout = () => {
        dispatch(clearAuth());
        navigate("/");
    };

    // === Layout ===
    return (
        <Box className="min-h-screen flex flex-col overflow-x-hidden bg-gradient-to-b from-white to-slate-50 text-slate-900">
            {/* Top Navigation Bar */}
            <TopBar onMenuClick={() => {}} onLogout={logout} />

            {/* Grid layout: sidebar + content */}
            <Box className="flex-1 block min-w-0 md:grid md:grid-cols-[300px_1fr] md:gap-0">
                {/* Sidebar column (hidden on mobile) */}
                <Box className="hidden md:block border-r border-slate-200">
                    <SidebarContent
                        orgs={MOCK}
                        orgId={orgId}
                        onChangeOrg={setOrgId}
                        divisions={org?.divisions ?? []}
                        divisionId={divisionId}
                        onChangeDivision={setDivisionId}
                        meetings={meetings}
                        selectedMeetingId={selectedMeetingId}
                        onSelectMeeting={setSelectedMeetingId}
                        onCreateDivision={async (name) => {
                            // TODO: replace with API call
                            // Example mock: insert into current org
                            const id = `div-${Math.random().toString(36).slice(2, 8)}`;
                            org?.divisions.push({ id, name, meetings: [] });
                            // force refresh if needed (if using immutable patterns, set state accordingly)
                            setDivisionId(id);
                        }}
                    />
                    
                </Box>

                {/* Main content */}
                <Box className="min-w-0">
                    <Container maxWidth="lg" className="min-w-0 py-4 md:py-6">
                        {/* Table */}
                        <MeetingsTable
                            meetings={meetings}
                            selectedMeetingId={selectedMeetingId}
                            onSelectMeeting={setSelectedMeetingId}
                            onCreateMeeting={async (m) => {
                                // Example local mock — replace with your API call later
                                const id = `m-${Math.random().toString(36).slice(2, 8)}`;
                                const newMeeting = { ...m, id };
                                division?.meetings.push(newMeeting);
                                setSelectedMeetingId(id);
                            }}
                        />


                        {/* Meeting details */}
                        <Box className="mt-4">
                            <MeetingDetails
                                meeting={selectedMeeting}
                                orgName={org?.name ?? "—"}
                                divisionName={division?.name ?? "—"}
                            />
                        </Box>
                    </Container>
                </Box>
            </Box>
        </Box>
    );
}
