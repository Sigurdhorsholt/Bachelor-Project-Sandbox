// src/domain/agenda.ts
import type {PropositionDto} from "./propositions.ts";

export type AgendaItemDto = {
  id: string;
  title: string;
  description?: string | null;
};

export type AgendaItemFull = {
    id: string;
    title: string;
    description?: string | null;
    propositions: PropositionDto[];
};
