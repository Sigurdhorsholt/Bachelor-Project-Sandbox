-- Drop existing constraints and table
DROP TABLE IF EXISTS public.ballots CASCADE;

-- Recreate ballots table with VotationId instead of PropositionId
CREATE TABLE public.ballots (
                                id uuid PRIMARY KEY,  -- No DEFAULT here
                                admissionticketid uuid NOT NULL,
                                votationid uuid NOT NULL,
                                voteoptionid uuid NOT NULL,
                                castatutc timestamp with time zone NOT NULL DEFAULT NOW(),

                                CONSTRAINT fk_ballots_admissiontickets
                                    FOREIGN KEY (admissionticketid)
                                        REFERENCES public.admissiontickets(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT fk_ballots_votation
                                    FOREIGN KEY (votationid)
                                        REFERENCES public.votation(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT fk_ballots_voteoptions
                                    FOREIGN KEY (voteoptionid)
                                        REFERENCES public.voteoptions(id)
                                        ON DELETE CASCADE
);

-- Create indexes (matching your naming convention)
CREATE INDEX ix_ballots_ticket ON public.ballots(admissionticketid);
CREATE INDEX ix_ballots_votation ON public.ballots(votationid);
CREATE INDEX ix_ballots_option ON public.ballots(voteoptionid);

-- Ensure unique ballot per admission ticket per votation
CREATE UNIQUE INDEX idx_ballots_unique_ticket_votation
    ON public.ballots(admissionticketid, votationid);

ALTER TABLE public.ballots OWNER TO bachelordb_user;
