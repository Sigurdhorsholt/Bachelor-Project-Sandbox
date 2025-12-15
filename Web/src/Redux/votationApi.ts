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

// Results DTO for a single votation
export type VotationResultsDto = {
    votationId: string;
    propositionId: string;
    question: string;
    totalVotes: number;
    results: {
        voteOptionId: string;
        label: string;
        count: number;
    }[];
    open: boolean;
    startedAt?: string | null;
    endedAt?: string | null;
};

function toVotationResults(raw: any): VotationResultsDto {
    const resultsRaw = raw.results ?? raw.Results ?? [];
    return {
        votationId: raw.votationId ?? raw.VotationId ?? "",
        propositionId: raw.propositionId ?? raw.PropositionId ?? "",
        question: raw.question ?? raw.Question ?? "",
        totalVotes: raw.totalVotes ?? raw.TotalVotes ?? 0,
        results: Array.isArray(resultsRaw) ? resultsRaw.map((r: any) => ({
            voteOptionId: r.voteOptionId ?? r.VoteOptionId ?? r.voteOptionId ?? r.VoteOptionId ?? "",
            label: r.label ?? r.Label ?? "",
            count: r.count ?? r.Count ?? 0,
        })) : [],
        open: raw.open ?? raw.Open ?? false,
        startedAt: raw.startedAt ?? raw.StartedAt ?? raw.startedAtUtc ?? raw.StartedAtUtc ?? null,
        endedAt: raw.endedAt ?? raw.EndedAt ?? raw.endedAtUtc ?? raw.EndedAtUtc ?? null,
    };
}

export const votationApi = api.injectEndpoints({
    endpoints: (b) => ({

        // POST /api/votation/start/{meetingId}/{propositionId}
        startVoteAndCreateVotation: b.mutation<VotationDto, { meetingId: string; propositionId: string }>({
            query: ({ meetingId, propositionId }) => ({ url: `/votation/start/${meetingId}/${propositionId}`, method: "POST" }),
            transformResponse: (raw: any) => toVotation(raw),
            invalidatesTags: (result, _err, { meetingId, propositionId }) => [
                { type: "Meeting", id: meetingId },
                { type: "Votations", id: propositionId }
            ],
        }),

        // POST /api/votation/stop/{propositionId}
        stopVotation: b.mutation<VotationDto, string>({
            query: (propositionId) => ({ url: `/votation/stop/${propositionId}`, method: "POST" }),
            transformResponse: (raw: any) => toVotation(raw),
            invalidatesTags: (result) => result ? [
                { type: "Meeting", id: result.meetingId },
                { type: "Votations", id: result.propositionId }
            ] : [],
        }),

        // POST /api/votation/revote/{propositionId}
        startReVote: b.mutation<void, string>({
            query: (propositionId) => ({ url: `/votation/revote/${propositionId}`, method: "POST" }),
            // no response body expected
            invalidatesTags: (_result, _err, propositionId) => [
                { type: "Votations" as const, id: propositionId }
            ],
        }),

        // GET /api/votation/{votationId}
        getVotation: b.query<VotationDto, string>({
            query: (votationId) => `/votation/${votationId}`,
            transformResponse: (raw: any) => toVotation(raw),
            providesTags: (result, _err) => (result ? [{ type: "Meeting" as const, id: result.meetingId }] : []),
        }),

        // GET /api/votation/open-votes/{meetingId}
        getOpenVotationsByMeetingId: b.query<VotationDto[], string>({
            query: (meetingId) => `/votation/open-votes/${meetingId}`,
            transformResponse: (raw: any) => (Array.isArray(raw) ? raw.map(toVotation) : []),
            providesTags: (result, _err, meetingId) => [{ type: "Meeting" as const, id: meetingId }],
        }),

        // GET /api/votation/results/{votationId}
        getVotationResults: b.query<VotationResultsDto, string>({
            query: (votationId) => `/votation/results/${votationId}`,
            transformResponse: (raw: any) => toVotationResults(raw),
            providesTags: (result, _err, votationId) => [{ type: "Votations" as const, id: votationId }],
        }),

    }),
});

export const { useStartVoteAndCreateVotationMutation, useStopVotationMutation, useGetVotationQuery, useGetOpenVotationsByMeetingIdQuery, useGetVotationResultsQuery, useStartReVoteMutation } = votationApi;
