// routes/admin/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
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
import { useGetMeetingsQuery } from "../../Redux/meetingsApi";

type OrganisationId = string;
type DivisionId = string;
type MeetingId = string;

export default function AdminDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    const { data: currentUser, isLoading: isLoadingUser } = useMeQuery();
    
    const [selectedOrganisationId, setSelectedOrganisationId] = useState<OrganisationId>("");
    const [selectedDivisionId, setSelectedDivisionId] = useState<DivisionId>("");
    const [selectedMeetingId, setSelectedMeetingId] = useState<MeetingId>("");

    useEffect(() => {
        if (!isLoadingUser && currentUser?.organisations?.length) {
            setSelectedOrganisationId(previousId =>
                previousId || currentUser.organisations[0].id
            );
        }
    }, [isLoadingUser, currentUser]);

    const { data: divisions = [], isFetching: isLoadingDivisions } = useGetDivisionsQuery(
        selectedOrganisationId, 
        { skip: !selectedOrganisationId }
    );

    useEffect(() => {
        if (!selectedOrganisationId) return;
        
        if (divisions.length === 0) {
            setSelectedDivisionId("");
            return;
        }
        
        setSelectedDivisionId(previousId =>
            divisions.some(division => division.id === previousId)
                ? previousId
                : divisions[0].id
        );
    }, [selectedOrganisationId, divisions]);

    const { data: meetings = [], isFetching: isLoadingMeetings } = useGetMeetingsQuery(
        selectedDivisionId, 
        { skip: !selectedDivisionId }
    );

    const [createDivision] = useCreateDivisionMutation();

    useEffect(() => {
        setSelectedMeetingId("");
    }, [selectedDivisionId]);

    const handleLogout = () => {
        dispatch(clearAuth());
        navigate("/");
    };

    const handleCreateDivision = async (divisionName: string) => {
        if (!selectedOrganisationId) return;
        await createDivision({
            orgId: selectedOrganisationId,
            name: divisionName
        }).unwrap();
    };

    if (!isLoadingUser && (!currentUser?.organisations || currentUser.organisations.length === 0)) {
        return (
            <Box className="min-h-screen flex items-center justify-center text-slate-600">
                No organisations assigned to your account.
            </Box>
        );
    }

    if (isLoadingUser) {
        return (
            <Box className="min-h-screen flex items-center justify-center">
                Loading…
            </Box>
        );
    }

    const selectedOrganisation = currentUser?.organisations?.find(
        org => org.id === selectedOrganisationId
    ) ?? null;

    const selectedDivision = divisions.find(
        division => division.id === selectedDivisionId
    );

    const selectedMeeting = meetings.find(
        meeting => meeting.id === selectedMeetingId
    );

    return (
        <Box className="min-h-screen flex flex-col overflow-x-hidden bg-gradient-to-b from-white to-slate-50 text-slate-900">
            <TopBar onMenuClick={() => {}} onLogout={handleLogout} />

            <Box className="flex-1 block min-w-0 md:grid md:grid-cols-[300px_1fr] md:gap-0">
                {/* Sidebar */}
                <Box className="hidden md:block border-r border-slate-200">
                    <SidebarContent
                        orgs={(currentUser?.organisations ?? []).map(org => ({ 
                            ...org, 
                            divisions: [] 
                        }))}
                        orgId={selectedOrganisationId}
                        onChangeOrg={setSelectedOrganisationId}
                        divisions={divisions.map(division => ({ 
                            id: division.id, 
                            name: division.name, 
                            meetings: [] 
                        }))}
                        divisionId={selectedDivisionId}
                        onChangeDivision={setSelectedDivisionId}
                        meetings={meetings.map(meeting => ({
                            id: meeting.id,
                            title: meeting.title,
                            startsAt: meeting.startsAtUtc,
                            status: meeting.status,
                        }))}
                        selectedMeetingId={selectedMeetingId}
                        onSelectMeeting={setSelectedMeetingId}
                        onCreateDivision={handleCreateDivision}
                    />
                </Box>

                {/* Content */}
                <Box className="min-w-0">
                    <Container maxWidth="lg" className="min-w-0 py-4 md:py-6">
                        <MeetingsTable
                            divisionId={selectedDivisionId}
                            selectedMeetingId={selectedMeetingId}
                            onSelectMeeting={setSelectedMeetingId}
                        />

                        {(isLoadingDivisions || isLoadingMeetings) && (
                            <div className="text-sm text-slate-500 mt-2">Loading…</div>
                        )}

                        <Box className="mt-4">
                            <MeetingDetails
                                meeting={selectedMeeting ? {
                                    id: selectedMeeting.id,
                                    title: selectedMeeting.title,
                                    startsAt: selectedMeeting.startsAtUtc,
                                    status: selectedMeeting.status,
                                } : null}
                                orgName={selectedOrganisation?.name ?? "—"}
                                divisionName={selectedDivision?.name ?? "—"}
                            />
                        </Box>
                    </Container>
                </Box>
            </Box>
        </Box>
    );
}
