// routes/admin/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Box, Container } from "@mui/material";
import TopBar from "./components/TopBar";
import MeetingsTable from "./components/meetings/MeetingsTable";
import MeetingDetails from "./components/meetings/MeetingDetails";
import SidebarContent from "./components/sidebar/SidebarContent";
import { clearAuth } from "../../Redux/auth/authSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { useMeQuery } from "../../Redux/api";
import { useGetDivisionsQuery, useCreateDivisionMutation } from "../../Redux/divisionsApi";
import { useCreateMeetingMutation, useGetMeetingsQuery } from "../../Redux/meetingsApi";

export default function AdminDashboard() {
    /* ---------- Auth / routing ---------- */
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const logout = () => {
        dispatch(clearAuth());
        navigate("/");
    };

    const { data: me, isLoading: meLoading } = useMeQuery();
    const [orgId, setOrgId] = useState<string>("");

    useEffect(() => {
        if (!meLoading && me?.organisations?.length) {
            setOrgId(prev => prev || me.organisations[0].id);
        }
    }, [meLoading, me]);

    // Guard: no orgs
    if (!meLoading && (!me?.organisations || me.organisations.length === 0)) {
        return (
            <Box className="min-h-screen flex items-center justify-center text-slate-600">
                No organisations assigned to your account.
            </Box>
        );
    }

    const org = useMemo(
        () => me?.organisations?.find(o => o.id === orgId) ?? null,
        [me, orgId]
    );

    /* ---------- Divisions for selected org ---------- */
    const { data: divisionsData = [], isFetching: divisionsLoading } = useGetDivisionsQuery(orgId, {
        skip: !orgId,
    });

    const [divisionId, setDivisionId] = useState<string>("");

    useEffect(() => {
        if (!orgId) return;
        if (divisionsData.length === 0) {
            setDivisionId("");
            return;
        }
        setDivisionId(prev => (divisionsData.some(d => d.id === prev) ? prev : divisionsData[0].id));
    }, [orgId, divisionsData]);

    const [createDivision] = useCreateDivisionMutation();
    async function handleCreateDivision(name: string) {
        if (!orgId) return;
        await createDivision({ orgId, name }).unwrap();
        // invalidation will refetch divisions automatically
    }

    /* ---------- Meetings for selected division ---------- */
    const { data: meetingsData = [], isFetching: meetingsLoading } = useGetMeetingsQuery(divisionId, {
        skip: !divisionId,
    });

    // Adapt to the UI shape expected by MeetingsTable/MeetingDetails
    const meetings = meetingsData.map(m => ({
        id: m.id,
        title: m.title,
        startsAt: m.startsAtUtc, // display local later
        status: m.status, // typed as MeetingStatus from your API
    }));

    const [createMeeting] = useCreateMeetingMutation();
    const handleCreateMeeting = async (m: { title: string; startsAt: string; status: "Draft" | "Scheduled" | "Published" | "Finished" }) => {
        if (!divisionId) return;
        const startsAtUtc = new Date(m.startsAt).toISOString(); // local -> UTC for backend
        const created = await createMeeting({
            divisionId,
            title: m.title.trim(),
            startsAtUtc,
            status: m.status,
        }).unwrap();
        setSelectedMeetingId(created.id); // optional UX: focus new one
    };

    /* ---------- Selected meeting ---------- */
    const [selectedMeetingId, setSelectedMeetingId] = useState("");
    useEffect(() => {
        setSelectedMeetingId(""); // reset when division changes
    }, [divisionId]);

    const selectedMeeting = useMemo(
        () => meetings.find(m => m.id === selectedMeetingId) ?? null,
        [meetings, selectedMeetingId]
    );

    /* ---------- Initial loading ---------- */
    if (meLoading) {
        return (
            <Box className="min-h-screen flex items-center justify-center">
                Loading…
            </Box>
        );
    }

    /* ---------- Render ---------- */
    return (
        <Box className="min-h-screen flex flex-col overflow-x-hidden bg-gradient-to-b from-white to-slate-50 text-slate-900">
            <TopBar onMenuClick={() => {}} onLogout={logout} />

            <Box className="flex-1 block min-w-0 md:grid md:grid-cols-[300px_1fr] md:gap-0">
                {/* Sidebar */}
                <Box className="hidden md:block border-r border-slate-200">
                    <SidebarContent
                        orgs={(me?.organisations ?? []).map(o => ({ ...o, divisions: [] }))}
                        orgId={orgId}
                        onChangeOrg={setOrgId}
                        divisions={divisionsData.map(d => ({ id: d.id, name: d.name, meetings: [] }))} // replace when meetings are nested
                        divisionId={divisionId}
                        onChangeDivision={setDivisionId}
                        meetings={meetings} // list for current division
                        selectedMeetingId={selectedMeetingId}
                        onSelectMeeting={setSelectedMeetingId}
                        onCreateDivision={handleCreateDivision}
                    />
                </Box>

                {/* Content */}
                <Box className="min-w-0">
                    <Container maxWidth="lg" className="min-w-0 py-4 md:py-6">
                        <MeetingsTable
                            meetings={meetings}
                            selectedMeetingId={selectedMeetingId}
                            onSelectMeeting={setSelectedMeetingId}
                            onCreateMeeting={divisionId ? handleCreateMeeting : undefined}
                        />

                        {(divisionsLoading || meetingsLoading) && (
                            <div className="text-sm text-slate-500 mt-2">Loading…</div>
                        )}

                        <Box className="mt-4">
                            <MeetingDetails
                                meeting={selectedMeeting}
                                orgName={org?.name ?? "—"}
                                divisionName={divisionsData.find(d => d.id === divisionId)?.name ?? "—"}
                            />
                        </Box>
                    </Container>
                </Box>
            </Box>
        </Box>
    );
}
