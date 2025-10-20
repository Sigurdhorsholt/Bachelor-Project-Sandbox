// src/domain/meetings.ts
// Meeting status values (numeric mapping to backend enum) - erasable safe
export const MeetingStatusValues = {
  Draft: 0,
  Scheduled: 1,
  Published: 2,
  Finished: 3,
} as const;
export type MeetingStatus = typeof MeetingStatusValues[keyof typeof MeetingStatusValues];
export type MeetingStatusName = keyof typeof MeetingStatusValues; // "Draft" | ...

// Single meeting DTO (backend returns numeric Status for single meeting endpoint)
export type MeetingDto = {
  id: string;
  divisionId: string;
  title: string;
  startsAtUtc: string;
  status: MeetingStatusName; // enum name string
};

// List item DTO (division meetings list returns string Status)
export type MeetingListItemDto = {
  id: string;
  title: string;
  startsAtUtc: string;
  status: MeetingStatusName; // string name
};

// Create meeting request (uses string enum via backend JsonStringEnumConverter)
export type CreateMeetingPayload = {
  divisionId: string;
  title: string;
  startsAtUtc: string; // ISO UTC
  status: MeetingStatusName;
};

export type MeetingFullDto = MeetingDto & {
  agenda: {
    id: string;
    title: string;
    description?: string | null;
    propositions: { id: string; question: string; voteType: string }[];
  }[];
};
