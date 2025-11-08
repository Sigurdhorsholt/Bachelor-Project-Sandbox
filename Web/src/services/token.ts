
import {useSelector} from "react-redux";
import type {RootState} from "../Redux/store.ts";

export function getStoredAdminAccessToken(): string | undefined {

    const token = useSelector((state: RootState) => {
        return state.auth.accessToken;
    });    
    
    return token || undefined;
}

export function getStoredAttendeeAccessToken(): string | undefined {

    const token = useSelector((state: RootState) => {
        return state.attendeeAuth.accessToken;
    });

    return token || undefined;
}

