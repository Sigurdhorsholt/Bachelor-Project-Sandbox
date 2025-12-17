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

type StartReVoteResponse = {
    Message?: string;
    ClosedVotationsCount?: number;
    NewVotationId?: string | null;
    MeetingId?: string | null;
    PropositionId?: string | null;
    LatestVotationId?: string | null;
    StartedAtUtc?: string | null;
    Open?: boolean | null;
};

export const votationApi = api.injectEndpoints({
    endpoints: (b) => ({

        // POST /api/votation/start/{meetingId}/{propositionId}
        startVoteAndCreateVotation: b.mutation<VotationDto, { meetingId: string; propositionId: string }>({
            query: ({ meetingId, propositionId }) => ({ url: `/votation/start/${meetingId}/${propositionId}`, method: "POST" }),
            transformResponse: (raw: any) => toVotation(raw),
            invalidatesTags: (result, _err, { meetingId, propositionId }) => result ? [
                { type: "Meeting", id: meetingId },
                { type: "Votations", id: result.id },
                { type: "Votations", id: propositionId },
                { type: "Agenda", id: meetingId },
                { type: "Propositions", id: meetingId }
            ] : [],
        }),

        // POST /api/votation/stop/{propositionId}
        stopVotation: b.mutation<VotationDto, string>({
            query: (propositionId) => ({ url: `/votation/stop/${propositionId}`, method: "POST" }),
            transformResponse: (raw: any) => toVotation(raw),
            invalidatesTags: (result) => result ? [
                { type: "Meeting", id: result.meetingId },
                { type: "Votations", id: result.id },
                { type: "Votations", id: result.propositionId }
            ] : [],
        }),

        // POST /api/votation/revote/{propositionId}
        startReVote: b.mutation<StartReVoteResponse, { propositionId: string; meetingId: string }>({
            query: ({ propositionId }) => ({ url: `/votation/revote/${propositionId}`, method: "POST" }),
            transformResponse: (raw: any) => {
                return {
                    Message: raw?.message ?? raw?.Message,
                    ClosedVotationsCount: raw?.closedVotationsCount ?? raw?.ClosedVotationsCount ?? raw?.ClosedVotations ?? 0,
                    NewVotationId: raw?.newVotationId ?? raw?.NewVotationId ?? raw?.VotationId ?? null,
                    MeetingId: raw?.meetingId ?? raw?.MeetingId ?? null,
                    PropositionId: raw?.propositionId ?? raw?.PropositionId ?? null,
                    LatestVotationId: raw?.latestVotationId ?? raw?.LatestVotationId ?? raw?.latestVotationId ?? null,
                    StartedAtUtc: raw?.startedAtUtc ?? raw?.StartedAtUtc ?? null,
                    Open: raw?.open ?? raw?.Open ?? null,
                } as StartReVoteResponse;
            },
            invalidatesTags: (result, _err, { propositionId, meetingId }) => {
                const tags: any[] = [];
                if (result?.NewVotationId) {
                    tags.push({ type: "Votations" as const, id: result.NewVotationId });
                }
                if (result?.LatestVotationId) {
                    tags.push({ type: "Votations" as const, id: result.LatestVotationId });
                }
                tags.push({ type: "Votations" as const, id: propositionId });
                if (meetingId) {
                    tags.push({ type: "Agenda" as const, id: meetingId });
                    tags.push({ type: "Propositions" as const, id: meetingId });
                    tags.push({ type: "Meeting" as const, id: meetingId });
                }

                return tags;
            },
        }),

        // GET /api/votation/{votationId}
        getVotation: b.query<VotationDto, string>({
            query: (votationId) => `/votation/${votationId}`,
            transformResponse: (raw: any) => toVotation(raw),
            providesTags: (result, _err, votationId) => {
                const tags: any[] = [];
                if (result) {
                    tags.push({ type: "Meeting" as const, id: result.meetingId });
                    tags.push({ type: "Votations" as const, id: result.id });
                    tags.push({ type: "Votations" as const, id: result.propositionId });
                } else {
                    // Ensure queries depending on a votation id get invalidated when that id is targeted
                    tags.push({ type: "Votations" as const, id: votationId });
                }
                return tags;
            },
        }),

        // GET /api/votation/open-votes/{meetingId}
        getOpenVotationsByMeetingId: b.query<VotationDto[], string>({
            query: (meetingId) => `/votation/open-votes/${meetingId}`,
            transformResponse: (raw: any) => (Array.isArray(raw) ? raw.map(toVotation) : []),
            providesTags: (result, _err, meetingId) => {
                const tags: any[] = [{ type: "Meeting" as const, id: meetingId }];
                if (Array.isArray(result)) {
                    for (const v of result) {
                        tags.push({ type: "Votations" as const, id: v.id });
                        tags.push({ type: "Votations" as const, id: v.propositionId });
                    }
                }
                return tags;
            },
        }),

        // GET /api/votation/results/{votationId}
        getVotationResults: b.query<VotationResultsDto, string>({
            query: (votationId) => `/votation/results/${votationId}`,
            transformResponse: (raw: any) => toVotationResults(raw),
            providesTags: (result, _err, votationId) => [{ type: "Votations" as const, id: votationId }],
        }),

        // POST /api/votation/{votationId}/manual-ballots
        addManualBallots: b.mutation<
            { totalBallotsAdded: number; votationId: string; recordedAtUtc: string; countsByOption: Record<string, number> },
            { votationId: string; counts: Record<string, number>; notes?: string }
        >({
            query: ({ votationId, counts, notes }) => ({
                url: `/votation/${votationId}/manual-ballots`,
                method: "POST",
                body: { counts, notes },
            }),
            invalidatesTags: (_result, _err, { votationId }) => [
                { type: "Votations" as const, id: votationId }
            ],
        }),

    }),
});

export const { 
    useStartVoteAndCreateVotationMutation, 
    useStopVotationMutation, 
    useGetOpenVotationsByMeetingIdQuery, 
    useGetVotationResultsQuery, 
    useStartReVoteMutation,
    useAddManualBallotsMutation
} = votationApi;
