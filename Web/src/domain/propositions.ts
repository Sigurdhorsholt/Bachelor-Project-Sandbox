import type {VoteOptionDto} from "./voteOptions.ts";

export type VotationDto = {
  id: string;
  meetingId: string;
  propositionId: string;
  startedAtUtc?: string | null;
  endedAtUtc?: string | null;
  open: boolean;
  overwritten: boolean;
};

export type PropositionDto = {
  id: string;
  question: string;
  voteType: string;
  voteOptions: VoteOptionDto[];
  latestVotation?: VotationDto | null;
  isOpen?: boolean;
};
