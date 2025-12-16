// routes/meeting/MeetingAttendeeDashboard.tsx
// Thin container that composes MeetingHeader and AgendaList components.

import React from "react";
import {useNavigate, useParams} from "react-router-dom";
import {Box} from "@mui/material";
import {useDispatch} from "react-redux";
import {clearAttendeeAuth} from "../../Redux/attendeeAuth/attendeeAuthSlice";
import {useMeetingChannel} from "../../realTime/useMeetingChannel";
import {MeetingHeader} from "./components/MeetingHeader";
import {AgendaList} from "./components/AgendaList";
import TopBar from "../admin/components/TopBar";

export const MeetingAttendeeDashboard: React.FC = () => {
    const meetingId = useRouteMeetingId();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Subscribe to real-time updates
    useMeetingChannel(meetingId);

    const logout = () => {
        dispatch(clearAttendeeAuth());
        navigate("/");
    };

    return (
        <Box
            className="bg-gradient-to-b from-white to-slate-50"
            sx={{minHeight: "100vh", px: 2, py: {xs: 2, sm: 4}}}
        >
            <TopBar onMenuClick={() => {}} onLogout={logout} logoutButtonText="Forlad Møde"/>

            <Box sx={{maxWidth: 900, mx: "auto", mt: 4}}>
                <MeetingHeader meetingId={meetingId}/>
                <AgendaList meetingId={meetingId}/>
            </Box>
        </Box>
    );
};

/* ===================== Helpers ===================== */

const useRouteMeetingId = (): string => {
    const params = useParams<{ id: string }>();
    return typeof params?.id === "string" ? params.id : "";
};


export default MeetingAttendeeDashboard;
