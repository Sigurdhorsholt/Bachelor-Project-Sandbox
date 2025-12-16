import React from "react";
import { useParams } from "react-router-dom";
import { useGetMeetingQuery, useGetAgendaWithPropositionsQuery } from "../../../../Redux/meetingsApi.ts";
import FullScreenLoader from "../shared/FullScreenLoader.tsx";
import MeetingLiveAdminCore from "./MeetingLiveAdminCore.tsx";

/**
 * Thin loader component that fetches meeting + agenda data and passes to Core.
 * Responsibilities:
 * - Extract meetingId from URL params
 * - Fetch meeting and agenda data via RTK Query
 * - Show loader while data is loading
 * - Pass meeting and agenda to Core component
 */
export default function MeetingLiveAdmin() {
    const { id } = useParams() as { id?: string };
    const meetingId = id || "";

    const { data: meeting, isLoading: meetingLoading } = useGetMeetingQuery(meetingId, { skip: !id });
    const { data: agenda, isLoading: agendaLoading } = useGetAgendaWithPropositionsQuery(meetingId, { skip: !id });

    if (meetingLoading || agendaLoading || !meeting || !agenda) {
        return <FullScreenLoader message={"Loading meeting data"} submessage={"Redirecting when meeting is ready"}/>;
    }

    return <MeetingLiveAdminCore meeting={meeting} agendaList={agenda} />;
}

