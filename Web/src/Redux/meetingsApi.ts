import { api } from "./api";
import type {
    MeetingStatus, MeetingDto, MeetingListItemDto, MeetingStatusName, CreateMeetingPayload, MeetingFullDto,
    PublicMeetingMeta
} from "../domain/meetings";
import type {AgendaItemDto, AgendaItemFull} from "../domain/agenda";
import type { PropositionDto } from "../domain/propositions";
import type { VoteOptionDto } from "../domain/voteOptions";
import type { AccessStateDto } from "../domain/access";
import type { TicketDto } from "../domain/tickets";

export const meetingsApi = api.injectEndpoints({
    endpoints: (b) => ({
        // List meetings for division
        getMeetings: b.query<MeetingListItemDto[], string>({
            query: (divisionId) => `/divisions/${divisionId}/meetings`,
            providesTags: (_r, _e, divisionId) => [{ type: "Meeting", id: `LIST-${divisionId}` }],
            transformResponse: (items: any[]) => items.map(i => ({
                id: i.id,
                title: i.title,
                startsAtUtc: i.startsAtUtc ?? i.StartsAtUtc,
                status: normalizeStatus(i.status ?? i.Status),
            })) as MeetingListItemDto[],
        }),
        // Create meeting
        createMeeting: b.mutation<MeetingListItemDto, CreateMeetingPayload>({
            query: ({ divisionId, title, startsAtUtc, status }) => ({
                url: `/divisions/${divisionId}/meetings`,
                method: "POST",
                body: { Title: title, StartsAtUtc: startsAtUtc, Status: status },
            }),
            invalidatesTags: (_r, _e, { divisionId }) => [{ type: "Meeting", id: `LIST-${divisionId}` }],
            transformResponse: (i: any) => ({
                id: i.id,
                title: i.title,
                startsAtUtc: i.startsAtUtc ?? i.StartsAtUtc,
                status: normalizeStatus(i.status ?? i.Status),
                // include meetingCode if backend returned it
                meetingCode: i.meetingCode ?? i.MeetingCode ?? undefined,
            }) as MeetingListItemDto,
        }),

        // Meeting (single)
        getMeeting: b.query<MeetingDto, string>({
            query: (meetingId) => `/meetings/${meetingId}`,
            providesTags: (_r, _e, meetingId) => [{ type: "Meeting" as const, id: meetingId }],
            transformResponse: (i: any) => ({
                id: i.id,
                divisionId: i.divisionId ?? i.DivisionId ?? "",
                title: i.title,
                startsAtUtc: i.startsAtUtc ?? i.StartsAtUtc,
                status: normalizeStatus(i.status ?? i.Status),
                meetingCode: i.meetingCode ?? i.MeetingCode ?? undefined,
                started: i.started ?? i.Started ?? 0,
            }) as MeetingDto,
        }),

        getMeetingFull: b.query<MeetingFullDto, string>({
            query: (meetingId) => `/meetings/${meetingId}`,
            providesTags: (_r, _e, meetingId) => [
                { type: "Meeting", id: meetingId },
                { type: "Agenda", id: meetingId },
            ],
            transformResponse: (raw: any): MeetingFullDto => ({
                id: raw.id,
                divisionId: raw.divisionId ?? raw.DivisionId ?? "",
                title: raw.title,
                startsAtUtc: raw.startsAtUtc ?? raw.StartsAtUtc,
                status: normalizeStatus(raw.status ?? raw.Status),
                meetingCode: raw.meetingCode ?? raw.MeetingCode ?? undefined,
                started: raw.started ?? raw.Started ?? 0,
                agenda: (raw.agenda ?? raw.Agenda ?? []).map((a: any): AgendaItemFull => ({
                    id: a.id ?? a.Id,
                    title: a.title ?? a.Title,
                    description: a.description ?? a.Description ?? null,
                    propositions: (a.propositions ?? a.Propositions ?? []).map((p: any): PropositionDto => ({
                        id: p.id ?? p.Id,
                        question: p.question ?? p.Question ?? p.title ?? p.Title ?? "",
                        voteType: p.voteType ?? p.VoteType ?? "YesNoBlank",
                        voteOptions: (p.voteOptions ?? p.VoteOptions ?? []).map((o: any): VoteOptionDto => ({
                            id: o.id ?? o.Id,
                            label: o.label ?? o.Label ?? String(o.id ?? o.Id ?? ""),
                        })),
                    })),
                })),
            }),
        }),

        getMeetingPublic: b.query<PublicMeetingMeta, string>({
            // backend: GET /api/meetings/meta?code={code}
            query: (meetingId) => `/meetings/meta?meetingId=${meetingId}`,
            providesTags: (result, _err, meetingId) => [
                { type: "Meeting" as const, id: result?.id ?? `CODE-${meetingId}` }
            ],
            transformResponse: (raw: any) =>
                ({
                    id: raw.id,
                    title: raw.title,
                    startsAtUtc: raw.startsAtUtc ?? raw.StartsAtUtc ?? null,
                    status: raw.status ?? raw.Status ?? undefined,
                    started: (raw.started ?? raw.Started) ?? 0,
                    locationName: raw.locationName ?? raw.LocationName ?? raw.location ?? null,
                } as PublicMeetingMeta),
        }),
        
        patchMeeting: b.mutation<
            { id: string; divisionId: string; title: string; startsAtUtc: string; status: string; agenda?: any[]; meetingCode?: string },
            { meetingId: string; patch: Partial<{ title: string; startsAtUtc: string; status: MeetingStatus | MeetingStatusName; regenerateMeetingCode?: boolean }>; divisionId?: string }
        >({
            query: ({ meetingId, patch }) => ({
                url: `/meetings/${meetingId}`,
                method: "PATCH",
                body: toPascalPatch(patch as any),
            }),
            transformResponse: (raw: any) => ({
                id: raw.id,
                divisionId: raw.divisionId ?? raw.DivisionId ?? "",
                title: raw.title,
                startsAtUtc: raw.startsAtUtc ?? raw.StartsAtUtc,
                status: normalizeStatus(raw.status ?? raw.Status),
                meetingCode: raw.meetingCode ?? raw.MeetingCode ?? undefined,
                agenda: (raw.agenda ?? raw.Agenda ?? []).map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    description: a.description ?? a.Description ?? null,
                    propositions: (a.propositions ?? a.Propositions ?? []).map((p: any) => ({
                        id: p.id,
                        question: p.question ?? p.Question ?? p.title ?? p.Title,
                        voteType: p.voteType ?? p.VoteType ?? "YesNoBlank",
                    }))
                }))
            }),
            invalidatesTags: (result, _err, arg) => {
                const tags: any[] = [{ type: "Meeting", id: arg.meetingId }];
                if (arg.divisionId) tags.push({ type: "Meeting", id: `LIST-${arg.divisionId}` });
                return tags;
            },
            async onQueryStarted({ meetingId }, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    // Update full meeting cache if present
                    dispatch(meetingsApi.util.updateQueryData('getMeetingFull', meetingId, (draft: any) => {
                        draft.title = data.title;
                        draft.startsAtUtc = data.startsAtUtc;
                        draft.status = data.status;
                        if (data.agenda) {
                            draft.agenda = data.agenda;
                        }
                        if (data.meetingCode) draft.meetingCode = data.meetingCode;
                    }));
                } catch { /* ignore */ }
            }
        }),

        // Agenda
        getAgenda: b.query<AgendaItemDto[], string>({
            query: (meetingId) => `/meetings/${meetingId}/agenda`,
            providesTags: (_r, _e, meetingId) => [{ type: "Agenda" as const, id: meetingId }],
        }),

        createAgendaItem: b.mutation<AgendaItemDto, { meetingId: string; title: string; description?: string | null }>({
            query: ({ meetingId, title, description }) => ({
                url: `/meetings/${meetingId}/agenda`,
                method: "POST",
                body: { title, description },
            }),
            invalidatesTags: (_r, _e, { meetingId }) => [{ type: "Agenda", id: meetingId }],
        }),

        updateAgendaItem: b.mutation<AgendaItemDto, { meetingId: string; itemId: string; title?: string; description?: string | null }>({
            query: ({ meetingId, itemId, title, description }) => ({
                url: `/meetings/${meetingId}/agenda/${itemId}`,
                method: "PATCH",
                body: { title, description },
            }),
            invalidatesTags: (_r, _e, { meetingId }) => [{ type: "Agenda", id: meetingId }],
        }),

        deleteAgendaItem: b.mutation<void, { meetingId: string; itemId: string }>({
            query: ({ meetingId, itemId }) => ({
                url: `/meetings/${meetingId}/agenda/${itemId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_r, _e, { meetingId }) => [{ type: "Agenda", id: meetingId }],
        }),

        // Propositions
        getPropositions: b.query<PropositionDto[], { meetingId: string; itemId: string }>({
            query: ({ meetingId, itemId }) => `/meetings/${meetingId}/agenda/${itemId}/propositions`,
            providesTags: (_r, _e, { itemId }) => [{ type: "Propositions" as const, id: itemId }],
        }),

        createProposition: b.mutation<PropositionDto, { meetingId: string; itemId: string; question: string; voteType: string }>({
            query: ({ meetingId, itemId, question, voteType }) => ({
                url: `/meetings/${meetingId}/agenda/${itemId}/propositions`,
                method: "POST",
                body: { question, voteType },
            }),
            invalidatesTags: (_r, _e, { itemId, meetingId }) => [
                { type: "Propositions", id: itemId },
                { type: "Agenda", id: meetingId }, // if you show counts on agenda list
            ],
        }),

        updateProposition: b.mutation<PropositionDto, { meetingId: string; itemId: string; propId: string; question?: string; voteType?: string }>({
            query: ({ meetingId, itemId, propId, question, voteType }) => ({
                url: `/meetings/${meetingId}/agenda/${itemId}/propositions/${propId}`,
                method: "PATCH",
                body: { question, voteType },
            }),
            invalidatesTags: (_r, _e, { itemId }) => [{ type: "Propositions", id: itemId }],
        }),

        deleteProposition: b.mutation<void, { meetingId: string; itemId: string; propId: string }>({
            query: ({ meetingId, itemId, propId }) => ({
                url: `/meetings/${meetingId}/agenda/${itemId}/propositions/${propId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_r, _e, { itemId, meetingId }) => [
                { type: "Propositions", id: itemId },
                { type: "Agenda", id: meetingId },
            ],
        }),

        // Vote options
        getVoteOptions: b.query<VoteOptionDto[], { meetingId: string; itemId: string; propId: string }>({
            query: ({ meetingId, itemId, propId }) => `/meetings/${meetingId}/agenda/${itemId}/propositions/${propId}/vote-options`,
            providesTags: (_r, _e, { propId }) => [{ type: "VoteOptions" as const, id: propId }],
        }),

        createVoteOption: b.mutation<VoteOptionDto, { meetingId: string; itemId: string; propId: string; label: string }>({
            query: ({ meetingId, itemId, propId, label }) => ({
                url: `/meetings/${meetingId}/agenda/${itemId}/propositions/${propId}/vote-options`,
                method: "POST",
                body: { label },
            }),
            invalidatesTags: (_r, _e, { propId }) => [{ type: "VoteOptions", id: propId }],
        }),

        updateVoteOption: b.mutation<VoteOptionDto, { meetingId: string; itemId: string; propId: string; voteOptionId: string; label: string }>({
            query: ({ meetingId, itemId, propId, voteOptionId, label }) => ({
                url: `/meetings/${meetingId}/agenda/${itemId}/propositions/${propId}/vote-options/${voteOptionId}`,
                method: "PATCH",
                body: { label },
            }),
            invalidatesTags: (_r, _e, { propId }) => [{ type: "VoteOptions", id: propId }],
        }),

        deleteVoteOption: b.mutation<void, { meetingId: string; itemId: string; propId: string; voteOptionId: string }>({
            query: ({ meetingId, itemId, propId, voteOptionId }) => ({
                url: `/meetings/${meetingId}/agenda/${itemId}/propositions/${propId}/vote-options/${voteOptionId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_r, _e, { propId }) => [{ type: "VoteOptions", id: propId }],
        }),

        // Access
        getAccess: b.query<AccessStateDto, string>({
            query: (meetingId) => `/meetings/${meetingId}/access`,
            providesTags: (_r, _e, meetingId) => [{ type: "MeetingAccess", id: meetingId }],
        }),

        updateAccess: b.mutation<AccessStateDto, { meetingId: string; meetingCode?: string; accessMode?: string }>({
            query: ({ meetingId, ...body }) => ({
                url: `/meetings/${meetingId}/access`,
                method: "PUT",
                body,
            }),
            invalidatesTags: (_r, _e, { meetingId }) => [{ type: "MeetingAccess", id: meetingId }],
        }),

        // Tickets
        getTickets: b.query<TicketDto[], string>({
            query: (meetingId) => `/meetings/${meetingId}/codes`,
            providesTags: (_r, _e, meetingId) => [{ type: "Ticket", id: `LIST-${meetingId}` }],
        }),

        generateTickets: b.mutation<TicketDto[], { meetingId: string; count: number }>({
            query: ({ meetingId, count }) => ({
                url: `/meetings/${meetingId}/codes?count=${count}`,
                method: "POST",
            }),
            invalidatesTags: (_r, _e, { meetingId }) => [
                { type: "Ticket", id: `LIST-${meetingId}` },
                { type: "MeetingAccess", id: meetingId },
            ],
        }),

        // Clear all tickets for a meeting
        clearTickets: b.mutation<void, string>({
            query: (meetingId) => ({ url: `/meetings/${meetingId}/codes`, method: "DELETE" }),
            invalidatesTags: (_r, _e, meetingId) => [
                { type: "Ticket", id: `LIST-${meetingId}` },
                { type: "MeetingAccess", id: meetingId },
            ],
        }),

        // Replace tickets (clear existing and generate `count` new ones)
        replaceTickets: b.mutation<TicketDto[], { meetingId: string; count: number }>({
            query: ({ meetingId, count }) => ({ url: `/meetings/${meetingId}/codes/replace?count=${count}`,
                method: "POST" 
            }),
            invalidatesTags: (_r, _e, { meetingId }) => [
                { type: "Ticket", id: `LIST-${meetingId}` },
                { type: "MeetingAccess", id: meetingId },
            ],
        }),

        startMeeting: b.mutation<void, { id: string }>({
            query: ({ id }) => ({ url: `/meetings/${id}/start`,
                method: "POST"
            }),
            invalidatesTags: (r, e, { id }) => [{ type: "Meeting", id }],
        }),

        stopMeeting: b.mutation<void, { id: string }>({
            query: ({ id }) => ({ url: `/meetings/${id}/stop`,
                method: "POST"
            }),
            invalidatesTags: (r, e, { id }) => [{ type: "Meeting", id }],
        }),

    }),
});

const statusNames = ["Draft","Scheduled","Published","Finished"] as const;
type StatusName = typeof statusNames[number];

function normalizeStatus(raw: any): StatusName {
    switch (typeof raw) {
        case "string": {
            // exact name ("Draft", "Scheduled"...)
            if (statusNames.includes(raw as StatusName)) return raw as StatusName;

            // numeric string?
            const num = Number(raw);
            if (!Number.isNaN(num)) {
                return statusNames[num] ?? "Draft";
            }

            return "Draft";
        }

        case "number": {
            return statusNames[raw] ?? "Draft";
        }

        default:
            return "Draft";
    }
}

function toPascalPatch(patch: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === "startsAtUtc") { out["StartsAtUtc"] = v; continue; }
    if (k === "title") { out["Title"] = v; continue; }
    if (k === "status") { out["Status"] = v; continue; }
    if (k === "regenerateMeetingCode" || k === "RegenerateMeetingCode") { out["RegenerateMeetingCode"] = v; continue; }
    // fallback: capitalize first letter
    out[k.charAt(0).toUpperCase() + k.slice(1)] = v;
  }
  return out;
}

export const {
    useGetMeetingsQuery,
    useCreateMeetingMutation,

    useGetMeetingQuery,
    useGetMeetingFullQuery,
    usePatchMeetingMutation,
    useGetMeetingPublicQuery,

    useGetAgendaQuery,
    useCreateAgendaItemMutation,
    useUpdateAgendaItemMutation,
    useDeleteAgendaItemMutation,

    useGetPropositionsQuery,
    useCreatePropositionMutation,
    useUpdatePropositionMutation,
    useDeletePropositionMutation,

    useGetVoteOptionsQuery,
    useCreateVoteOptionMutation,
    useUpdateVoteOptionMutation,
    useDeleteVoteOptionMutation,

    useGetAccessQuery,
    useUpdateAccessMutation,

    useGetTicketsQuery,
    useGenerateTicketsMutation,
    useClearTicketsMutation,
    useReplaceTicketsMutation,
    
    useStartMeetingMutation,
    useStopMeetingMutation,
} = meetingsApi;
