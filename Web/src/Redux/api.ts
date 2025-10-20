// src/Redux/api.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";
import { clearAuth } from "./auth/authSlice";

export type MeResponse = {
    email: string;
    roles: string[];
    organisations: { id: string; name: string }[];
};

const rawBase = fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken;
        if (token) headers.set("authorization", `Bearer ${token}`);
        headers.set("accept", "application/json");
        return headers;
    },
});

type BaseQuery = ReturnType<typeof fetchBaseQuery>;
const baseQueryWithReauth: BaseQuery = async (args, api, extra) => {
    const res = await rawBase(args, api, extra);
    if ((res.error as any)?.status === 401) api.dispatch(clearAuth());
    return res;
};

export const api = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["Division", "Organisation", "Meeting", "MeetingAccess", "Ticket"],
    endpoints: (b) => ({
        login: b.mutation<{ accessToken: string; expiresAt: string; email: string; roles: string[] }, { email: string; password: string }>({
            query: (body) => ({ url: "/auth/login", method: "POST", body }),
        }),
        me: b.query<MeResponse, void>({ query: () => ({ url: "/auth/me" }) }),
    }),
});

export const { useLoginMutation, useMeQuery } = api;
