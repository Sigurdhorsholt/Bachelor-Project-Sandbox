// src/domain/propositions.ts
import type {VoteOptionDto} from "./voteOptions.ts";

/** Latest votation DTO */
export type VotationDto = {
  id: string;
  meetingId: string;
  propositionId: string;
  startedAtUtc?: string | null;
  endedAtUtc?: string | null;
  open: boolean;
  overwritten: boolean;
};

/** Proposition DTO */
export type PropositionDto = {
  id: string;
  question: string;
  voteType: string;
  voteOptions: VoteOptionDto[];
  // latest votation (nullable) - only the most recent votation is returned here
  latestVotation?: VotationDto | null;
  // whether the proposition currently has an open votation
  isOpen?: boolean;
};
