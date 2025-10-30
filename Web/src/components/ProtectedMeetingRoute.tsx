import { Navigate, Outlet, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../Redux/store.ts";
import { useAttendeeMeQuery } from "../Redux/api.ts";

export default function ProtectedMeetingRoute() {
    const { id: meetingId } = useParams<{ id: string }>();
    const token = useSelector((s: RootState) => s.attendeeAuth.accessToken);
    
    const { data, isFetching, isError } = useAttendeeMeQuery(undefined, { skip: !token });

    // If no token, redirect to landing page to enter access code
    if (!token) return <Navigate to="/" replace />;
    
    // Loading state
    if (isFetching) return <div className="p-6">Verifying access...</div>;
    
    // Invalid token or error
    if (isError || !data) return <Navigate to="/" replace />;
    
    // Ensure they're accessing the correct meeting
    if (data.meetingId !== meetingId) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
