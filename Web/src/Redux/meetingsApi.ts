// src/Redux/meetingsApi.ts
import { api } from "./api";

export type MeetingStatus = "Draft" | "Scheduled" | "Published" | "Finished";

export type Meeting = {
    id: string;
    title: string;
    startsAtUtc: string;
    status: MeetingStatus;
};

export const meetingsApi = api.injectEndpoints({
    endpoints: (b) => ({
        
        getMeetings: b.query<Meeting[], string>({
            query: (divisionId) => `/divisions/${divisionId}/meetings`,
            providesTags: (_r, _e, divisionId) => [{ type: "Meeting", id: `LIST-${divisionId}` }],
        }),

        createMeeting: b.mutation<
            Meeting,
            { divisionId: string; title: string; startsAtUtc: string; status: MeetingStatus }
        >({
            query: ({ divisionId, ...body }) => ({
                url: `/divisions/${divisionId}/meetings`,
                method: "POST",
                body,
            }),
            invalidatesTags: (_r, _e, { divisionId }) => [{ type: "Meeting", id: `LIST-${divisionId}` }],
        }),
        
        
    }),
});

export const { useGetMeetingsQuery, useCreateMeetingMutation } = meetingsApi;
