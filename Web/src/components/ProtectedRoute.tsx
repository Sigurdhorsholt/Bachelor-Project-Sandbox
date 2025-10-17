import { useSelector } from "react-redux";
import type {RootState} from "../Redux/store.ts";
import {useMeQuery} from "../Redux/api.ts";
import { Navigate, Outlet } from "react-router-dom";


type Props = { roles?: string[] };

export default function ProtectedRoute({ roles }: Props) {

    const token = useSelector((s: RootState) => {
        return s.auth.accessToken;
    });
    
    const { data, isFetching, isError } = useMeQuery(undefined, { skip: !token });

    if (!token) return <Navigate to="/" replace />;
    if (isFetching) return <div className="p-6">Checking session…</div>;
    if (isError || !data) return <Navigate to="/" replace />;

    return <Outlet />;
}
