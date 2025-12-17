
export const MeetingStatusValues = {
  Draft: 0,
  Scheduled: 1,
  Published: 2,
  Finished: 3,
} as const;
export type MeetingStatus = typeof MeetingStatusValues[keyof typeof MeetingStatusValues];
export type MeetingStatusName = keyof typeof MeetingStatusValues;

export type MeetingDto = {
  id: string;
  divisionId: string;
  title: string;
  startsAtUtc: string;
  status: MeetingStatusName;
  meetingCode?: string | undefined;
  started: number;
};

export type MeetingListItemDto = {
  id: string;
  title: string;
  startsAtUtc: string;
  status: MeetingStatusName;
  meetingCode?: string | undefined;
};

export type CreateMeetingPayload = {
  divisionId: string;
  title: string;
  startsAtUtc: string;
  status: MeetingStatusName;
};

export type PublicMeetingMeta = {
    id: string;
    title: string;
    startsAtUtc?: string | null;
    status?: string;
    started?: number;
    locationName?: string | null;
};