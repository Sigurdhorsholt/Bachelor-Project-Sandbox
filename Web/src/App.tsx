import {createBrowserRouter, RouterProvider} from "react-router-dom";
import LandingPage from "./routes/LandingPage.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./routes/admin/AdminDashboard.tsx";
import MeetingEditor from "./routes/admin/components/meetings/MeetingEditor.tsx";
import MeetingLiveAdmin from "./routes/admin/components/meetings/MeetingLiveAdmin.tsx";

function MeetingPlaceholder() {
    return <div className="p-6">TODO: Public meeting join page</div>;
}

const router = createBrowserRouter([
    {path: "/", element: <LandingPage/>},
    {path: "/meeting/:id", element: <MeetingPlaceholder/>},
    {
        element: <ProtectedRoute/>,
        children: [
            {path: "/admin", element: <AdminDashboard/>},
            {path: "/admin/meetings/:id", element: <MeetingEditor/>},
            {path: "/admin/meetings/:id/live", element: <MeetingLiveAdmin/>},
        ],

    },
]);

export default function App() {
    return <RouterProvider router={router}/>;
}
