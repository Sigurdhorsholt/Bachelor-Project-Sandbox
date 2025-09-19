import { Navigate, Outlet } from 'react-router-dom'
import {useGetCurrentUserQuery} from "../stores/authApi.ts";


export default function ProtectedRoute() {
    const { data, isLoading } = useGetCurrentUserQuery()

    if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>
    if (!data || data.role !== 'admin') return <Navigate to="/" replace />
    return <Outlet />
}
