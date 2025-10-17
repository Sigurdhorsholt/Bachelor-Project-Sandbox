import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LandingPage from "./routes/LandingPage.tsx";
import AdminDashboard from "./routes/AdminDashboard.tsx";
import ProtectedRoute from "./components/ProtectedRoute";

function MeetingPlaceholder() {
    return <div className="p-6">TODO: Public meeting join page</div>;
}

const router = createBrowserRouter([
    { path: "/", element: <LandingPage /> },
    { path: "/meeting/:id", element: <MeetingPlaceholder /> },
    {
        element: <ProtectedRoute />,
        children: [{ path: "/admin", element: <AdminDashboard /> }],
    },
]);

export default function App() {
    return <RouterProvider router={router} />;
}
