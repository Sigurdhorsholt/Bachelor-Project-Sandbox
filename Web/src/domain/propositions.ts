// src/domain/propositions.ts
import type {VoteOptionDto} from "./voteOptions.ts";

/** Proposition DTO */
export type PropositionDto = {
  id: string;
  question: string;
  voteType: string;
  voteOptions: VoteOptionDto[];
};

