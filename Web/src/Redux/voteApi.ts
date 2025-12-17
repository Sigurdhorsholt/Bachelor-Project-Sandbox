import { api } from "./api";

export type CastVoteRequest = {
    meetingId: string;
    propositionId: string;
    voteOptionId: string;
    code: string;
};

export type CastVoteResponse = {
    message: string;
    ballotId: string;
    voteId: string;
    votationId: string;
    action: "Created" | "Updated";
};

export type VoteCheckResponse = {
    hasVoted: boolean;
    votationId: string;
    ballotId?: string;
    voteOptionId?: string;
    voteOptionLabel?: string;
    castAt?: string;
};

export type VotationResultsResponse = {
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
    startedAt: string;
    endedAt?: string | null;
};

/* -------------------- API -------------------- */

export const voteApi = api.injectEndpoints({
    endpoints: (b) => ({
        // POST /api/vote/cast
        castVote: b.mutation<CastVoteResponse, CastVoteRequest>({
            query: (body) => ({
                url: "/vote/cast",
                method: "POST",
                body,
            }),
            invalidatesTags: (_result, _error, { meetingId, propositionId }) => [
                { type: "Meeting", id: meetingId },
                { type: "Votations", id: propositionId },
            ],
        }),

        // GET /api/vote/check/{code}/{votationId}
        checkIfVoted: b.query<VoteCheckResponse, { code: string; votationId: string }>({
            query: ({ code, votationId }) => `/vote/check/${code}/${votationId}`,
            providesTags: (_result, _error, { votationId }) => [
                { type: "Votations", id: votationId },
            ],
        }),

        // GET /api/vote/results/{votationId}
        getVotationResults: b.query<VotationResultsResponse, string>({
            query: (votationId) => `/vote/results/${votationId}`,
            providesTags: (_result, _error, votationId) => [
                { type: "Votations", id: votationId },
            ],
        }),

        // GET /api/vote/meeting/{meetingId}/all (admin endpoint)
        getAllVotesForMeeting: b.query<any[], string>({
            query: (meetingId) => `/vote/meeting/${meetingId}/all`,
            providesTags: (_result, _error, meetingId) => [
                { type: "Meeting", id: meetingId },
            ],
        }),

        // DELETE /api/vote/{ballotId} (admin endpoint)
        revokeVote: b.mutation<{ message: string }, string>({
            query: (ballotId) => ({
                url: `/vote/${ballotId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Meeting", "Votations"],
        }),
    }),
});

export const {
    useCastVoteMutation,
    useCheckIfVotedQuery,
    useLazyCheckIfVotedQuery,
    useGetVotationResultsQuery,
    useGetAllVotesForMeetingQuery,
    useRevokeVoteMutation,
} = voteApi;

