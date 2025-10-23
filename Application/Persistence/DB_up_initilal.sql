-- === Schema (PostgreSQL) ===
CREATE TABLE IF NOT EXISTS organisation (
                                            id TEXT PRIMARY KEY,
                                            name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS division (
                                        id TEXT PRIMARY KEY,
                                        organisationid TEXT NOT NULL,
                                        name TEXT NOT NULL,
                                        CONSTRAINT fk_division_org
                                        FOREIGN KEY (organisationid) REFERENCES organisation(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS users (
                                     id TEXT PRIMARY KEY,
                                     organisationid TEXT NOT NULL,
                                     email TEXT NOT NULL UNIQUE,
                                     passwordhash TEXT NOT NULL,
                                     createdatutc TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_users_org
    FOREIGN KEY (organisationid) REFERENCES organisation(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS userroles (
                                         id TEXT PRIMARY KEY,
                                         userid TEXT NOT NULL,
                                         role TEXT NOT NULL,
                                         CONSTRAINT fk_userroles_user
                                         FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS meetings (
                                        id TEXT PRIMARY KEY,
                                        divisionid TEXT NOT NULL,
                                        title TEXT NOT NULL,
                                        startsatutc TIMESTAMPTZ NOT NULL,
                                        meetingcode TEXT NOT NULL UNIQUE,
                                        CONSTRAINT fk_meetings_division
                                        FOREIGN KEY (divisionid) REFERENCES division(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS agendaitems (
                                           id TEXT PRIMARY KEY,
                                           meetingid TEXT NOT NULL,
                                           title TEXT NOT NULL,
                                           description TEXT,
                                           CONSTRAINT fk_agendaitems_meeting
                                           FOREIGN KEY (meetingid) REFERENCES meetings(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS propositions (
                                            id TEXT PRIMARY KEY,
                                            agendaitemid TEXT NOT NULL,
                                            question TEXT NOT NULL,
                                            votetype TEXT NOT NULL,
                                            CONSTRAINT fk_propositions_agendaitems
                                            FOREIGN KEY (agendaitemid) REFERENCES agendaitems(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS voteoptions (
                                           id TEXT PRIMARY KEY,
                                           propositionid TEXT NOT NULL,
                                           label TEXT NOT NULL,
                                           CONSTRAINT fk_voteoptions_propositions
                                           FOREIGN KEY (propositionid) REFERENCES propositions(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS admissiontickets (
                                                id TEXT PRIMARY KEY,
                                                meetingid TEXT NOT NULL,
                                                code TEXT NOT NULL UNIQUE,
                                                used BOOLEAN NOT NULL DEFAULT FALSE,
                                                CONSTRAINT fk_admissiontickets_meetings
                                                FOREIGN KEY (meetingid) REFERENCES meetings(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS ballots (
                                       id TEXT PRIMARY KEY,
                                       admissionticketid TEXT NOT NULL,
                                       propositionid TEXT NOT NULL,
                                       voteoptionid TEXT NOT NULL,
                                       castatutc TIMESTAMPTZ NOT NULL,
                                       CONSTRAINT fk_ballots_tickets
                                       FOREIGN KEY (admissionticketid) REFERENCES admissiontickets(id),
    CONSTRAINT fk_ballots_propositions
    FOREIGN KEY (propositionid) REFERENCES propositions(id),
    CONSTRAINT fk_ballots_voteoptions
    FOREIGN KEY (voteoptionid) REFERENCES voteoptions(id)
    );

CREATE TABLE IF NOT EXISTS votes (
                                     id TEXT PRIMARY KEY,
                                     ballotid TEXT NOT NULL UNIQUE,
                                     createdatutc TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_votes_ballots
    FOREIGN KEY (ballotid) REFERENCES ballots(id)
    );

CREATE TABLE IF NOT EXISTS auditableevents (
                                               id TEXT PRIMARY KEY,
                                               voteid TEXT NOT NULL UNIQUE,
                                               eventtype TEXT NOT NULL,
                                               metadata TEXT,
                                               timestamputc TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_auditableevents_votes
    FOREIGN KEY (voteid) REFERENCES votes(id)
    );

-- Helpful indexes (optional but recommended)
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_division_org ON division(organisationid);
CREATE INDEX IF NOT EXISTS ix_meetings_division ON meetings(divisionid);
CREATE INDEX IF NOT EXISTS ix_agendaitems_meeting ON agendaitems(meetingid);
CREATE INDEX IF NOT EXISTS ix_props_agendaitem ON propositions(agendaitemid);
CREATE INDEX IF NOT EXISTS ix_voteoptions_prop ON voteoptions(propositionid);
CREATE INDEX IF NOT EXISTS ix_tickets_meeting ON admissiontickets(meetingid);
CREATE INDEX IF NOT EXISTS ix_ballots_ticket ON ballots(admissionticketid);
CREATE INDEX IF NOT EXISTS ix_ballots_prop ON ballots(propositionid);
CREATE INDEX IF NOT EXISTS ix_ballots_option ON ballots(voteoptionid);
