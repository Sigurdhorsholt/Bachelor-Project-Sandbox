CREATE TABLE Organisation (
                              Id TEXT PRIMARY KEY,
                              Name TEXT NOT NULL
);

CREATE TABLE Division (
                          Id TEXT PRIMARY KEY,
                          OrganisationId TEXT NOT NULL,
                          Name TEXT NOT NULL,
                          FOREIGN KEY (OrganisationId) REFERENCES Organisation(Id) ON DELETE CASCADE
);

CREATE TABLE Users (
                       Id TEXT PRIMARY KEY,
                       OrganisationId TEXT NOT NULL,
                       Email TEXT NOT NULL UNIQUE,
                       PasswordHash TEXT NOT NULL,
                       CreatedAtUtc TEXT NOT NULL,
                       FOREIGN KEY (OrganisationId) REFERENCES Organisation(Id) ON DELETE CASCADE
);

CREATE TABLE UserRoles (
                           Id TEXT PRIMARY KEY,
                           UserId TEXT NOT NULL,
                           Role TEXT NOT NULL,
                           FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE Meetings (
                          Id TEXT PRIMARY KEY,
                          DivisionId TEXT NOT NULL,
                          Title TEXT NOT NULL,
                          StartsAtUtc TEXT NOT NULL,
                          FOREIGN KEY (DivisionId) REFERENCES Division(Id) ON DELETE CASCADE
);

CREATE TABLE AgendaItems (
                             Id TEXT PRIMARY KEY,
                             MeetingId TEXT NOT NULL,
                             Title TEXT NOT NULL,
                             Description TEXT,
                             FOREIGN KEY (MeetingId) REFERENCES Meetings(Id) ON DELETE CASCADE
);

CREATE TABLE Propositions (
                              Id TEXT PRIMARY KEY,
                              AgendaItemId TEXT NOT NULL,
                              Question TEXT NOT NULL,
                              VoteType TEXT NOT NULL,
                              FOREIGN KEY (AgendaItemId) REFERENCES AgendaItems(Id) ON DELETE CASCADE
);

CREATE TABLE VoteOptions (
                             Id TEXT PRIMARY KEY,
                             PropositionId TEXT NOT NULL,
                             Label TEXT NOT NULL,
                             FOREIGN KEY (PropositionId) REFERENCES Propositions(Id) ON DELETE CASCADE
);

CREATE TABLE AdmissionTickets (
                                  Id TEXT PRIMARY KEY,
                                  MeetingId TEXT NOT NULL,
                                  Code TEXT NOT NULL UNIQUE,
                                  Used INTEGER NOT NULL DEFAULT 0,
                                  FOREIGN KEY (MeetingId) REFERENCES Meetings(Id) ON DELETE CASCADE
);

CREATE TABLE Ballots (
                         Id TEXT PRIMARY KEY,
                         AdmissionTicketId TEXT NOT NULL,
                         PropositionId TEXT NOT NULL,
                         VoteOptionId TEXT NOT NULL,
                         CastAtUtc TEXT NOT NULL,
                         FOREIGN KEY (AdmissionTicketId) REFERENCES AdmissionTickets(Id),
                         FOREIGN KEY (PropositionId) REFERENCES Propositions(Id),
                         FOREIGN KEY (VoteOptionId) REFERENCES VoteOptions(Id)
);

CREATE TABLE Votes (
                       Id TEXT PRIMARY KEY,
                       BallotId TEXT NOT NULL UNIQUE,
                       CreatedAtUtc TEXT NOT NULL,
                       FOREIGN KEY (BallotId) REFERENCES Ballots(Id)
);

CREATE TABLE AuditableEvents (
                                 Id TEXT PRIMARY KEY,
                                 VoteId TEXT NOT NULL UNIQUE,
                                 EventType TEXT NOT NULL,
                                 Metadata TEXT,
                                 TimestampUtc TEXT NOT NULL,
                                 FOREIGN KEY (VoteId) REFERENCES Votes(Id)
);
