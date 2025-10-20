// src/domain/propositions.ts
/** Proposition DTO */
export type PropositionDto = {
  id: string;
  question: string;
  voteType: string; // e.g. "YesNoBlank"
};

