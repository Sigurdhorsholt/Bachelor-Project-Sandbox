import { api } from "./api";


export type VotationDto = {
    id: string;
    meetingId: string;
    propositionId: string;
    startedAtUtc: string;
    endedAtUtc?: string | null;
    open: boolean;
    overwritten: boolean;
};

function toVotation(raw: any): VotationDto {
    return {
        id: raw.id ?? raw.Id,
        meetingId: raw.meetingId ?? raw.MeetingId ?? "",
        propositionId: raw.propositionId ?? raw.PropositionId ?? "",
        startedAtUtc: raw.startedAtUtc ?? raw.StartedAtUtc ?? raw.startedAt ?? raw.StartedAt ?? "",
        endedAtUtc: raw.endedAtUtc ?? raw.EndedAtUtc ?? null,
        open: raw.open ?? raw.Open ?? false,
        overwritten: raw.overwritten ?? raw.Overwritten ?? false,
    };
}

export const votationApi = api.injectEndpoints({
    endpoints: (b) => ({

        // POST /api/votation/start/{meetingId}/{propositionId}
        startVoteAndCreateVotation: b.mutation<VotationDto, { meetingId: string; propositionId: string }>({
            query: ({ meetingId, propositionId }) => ({ url: `/votation/start/${meetingId}/${propositionId}`, method: "POST" }),
            transformResponse: (raw: any) => toVotation(raw),
            invalidatesTags: (result, _err, { meetingId }) => [{ type: "Meeting" as const, id: meetingId }],
        }),

        // POST /api/votation/stop/{votationId}
        stopVotation: b.mutation<VotationDto, string>({
            query: (propositionId) => ({ url: `/votation/stop/${propositionId}`, method: "POST" }),            transformResponse: (raw: any) => toVotation(raw),
            invalidatesTags: (result) => (result ? [{ type: "Meeting" as const, id: result.meetingId }] : []),
        }),

        // GET /api/votation/{votationId}
        getVotation: b.query<VotationDto, string>({
            query: (votationId) => `/votation/openVotes/${votationId}`,
            transformResponse: (raw: any) => toVotation(raw),
            providesTags: (result, _err) => (result ? [{ type: "Meeting" as const, id: result.meetingId }] : []),
        }),

        // GET /api/votation/open-votes/{meetingId}
        getOpenVotationsByMeetingId: b.query<VotationDto[], string>({
            query: (meetingId) => `/votation/open-votes/${meetingId}`,
            transformResponse: (raw: any) => (Array.isArray(raw) ? raw.map(toVotation) : []),
            providesTags: (result, _err, meetingId) => [{ type: "Meeting" as const, id: meetingId }],
        }),

    }),
});

export const { useStartVoteAndCreateVotationMutation, useStopVotationMutation, useGetVotationQuery, useGetOpenVotationsByMeetingIdQuery } = votationApi;
