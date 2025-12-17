import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";
import { clearAuth } from "./auth/authSlice";
import { clearAttendeeAuth } from "./attendeeAuth/attendeeAuthSlice";

export type MeResponse = {
    email: string;
    roles: string[];
    organisations: { id: string; name: string }[];
};

export type AttendeeMeResponse = {
    meetingId: string;
    ticketId: string;
    ticketCode: string;
    type: "attendee";
};

const rawBase = fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { getState }) => {
        const state = getState() as RootState;
        const token = state.auth.accessToken || state.attendeeAuth.accessToken;
        if (token) headers.set("authorization", `Bearer ${token}`);
        headers.set("accept", "application/json");
        return headers;
    },
});

type BaseQuery = ReturnType<typeof fetchBaseQuery>;
const baseQueryWithReauth: BaseQuery = async (args, api, extra) => {
    const res = await rawBase(args, api, extra);
    if ((res.error as any)?.status === 401) {
        api.dispatch(clearAuth());
        api.dispatch(clearAttendeeAuth());
    }
    return res;
};

export const api = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["Division", "Organisation", "Meeting", "MeetingAccess", "Ticket", "Agenda", "Propositions", "VoteOptions", "Votations"],

    endpoints: (b) => ({
        login: b.mutation<{ accessToken: string; expiresAt: string; email: string; roles: string[] }, { email: string; password: string }>({
            query: (body) => ({ url: "/auth/login", method: "POST", body }),
        }),
        
        me: b.query<MeResponse, void>({ query: () => ({ url: "/auth/me" }) }),
        
        attendeeLogin: b.mutation<{ accessToken: string; expiresAt: string; meetingId: string; ticketId: string }, { meetingCode: string; accessCode: string }>({
            query: (body) => ({ url: "/auth/attendee/login", method: "POST", body }),
        }),
        
        attendeeMe: b.query<AttendeeMeResponse, void>({ query: () => ({ url: "/auth/attendee/me" }) }),
    }),
});

export const { useLoginMutation, useMeQuery, useAttendeeLoginMutation, useAttendeeMeQuery } = api;
