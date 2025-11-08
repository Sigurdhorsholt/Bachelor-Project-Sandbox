import {createBrowserRouter, RouterProvider} from "react-router-dom";
import LandingPage from "./routes/LandingPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./routes/admin/AdminDashboard.tsx";
import MeetingEditor from "./routes/admin/components/meetings/MeetingEditor.tsx";
import MeetingLiveAdmin from "./routes/admin/components/meetings/MeetingLiveAdmin.tsx";
import ProtectedMeetingRoute from "./components/ProtectedMeetingRoute.tsx";
import MeetingLogin from "./routes/meeting/MeetingLogin.tsx";
import {MeetingAttendeeDashboard} from "./routes/meeting/MeetingAttendeeDashboard.tsx";



const router = createBrowserRouter([
    {path: "/", element: <LandingPage/>},
    {path: "/meeting/:id/login", element: <MeetingLogin/>},
    {
        element: <ProtectedRoute/>,
        children: [
            {path: "/admin", element: <AdminDashboard/>},
            {path: "/admin/meetings/:id", element: <MeetingEditor/>},
            {path: "/admin/meetings/:id/live", element: <MeetingLiveAdmin/>},
        ],

    },
    {
        element: <ProtectedMeetingRoute/>,
        children: [
            {path: "/meeting/:id/live", element: <MeetingAttendeeDashboard/>},
        ],
    }
]);

export default function App() {
    return <RouterProvider router={router}/>;
}
