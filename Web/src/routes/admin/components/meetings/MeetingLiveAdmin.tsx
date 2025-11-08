import React from "react";
import { useParams } from "react-router-dom";
import { useGetMeetingFullQuery } from "../../../../Redux/meetingsApi.ts";
import FullScreenLoader from "../shared/FullScreenLoader.tsx";
import MeetingLiveAdminCore from "./MeetingLiveAdminCore.tsx";

export default function MeetingLiveAdmin() {
    const { id } = useParams() as { id?: string };
    const { data: meeting } = useGetMeetingFullQuery(id || "", { skip: !id });

    if (!meeting) {
        return <FullScreenLoader message={"Loading meeting data"} submessage={"Redirecting when meeting is ready"}/>;
    }

    return <MeetingLiveAdminCore meeting={meeting} />;
}
