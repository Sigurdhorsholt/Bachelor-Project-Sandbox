create table organisation
(
    id   uuid not null
        primary key,
    name text not null
);

alter table organisation
    owner to bachelordb_user;

create table division
(
    id             uuid not null
        primary key,
    organisationid uuid not null
        constraint fk_division_org
            references organisation
            on delete cascade,
    name           text not null
);

alter table division
    owner to bachelordb_user;

create index ix_division_org
    on division (organisationid);

create table users
(
    id             uuid                                   not null
        primary key,
    organisationid uuid                                   not null
        constraint fk_users_org
            references organisation
            on delete cascade,
    email          text                                   not null
        unique,
    passwordhash   text                                   not null,
    createdatutc   timestamp with time zone default now() not null
);

alter table users
    owner to bachelordb_user;

create table userroles
(
    id     uuid not null
        primary key,
    userid uuid not null
        constraint fk_userroles_user
            references users
            on delete cascade,
    role   text not null
);

alter table userroles
    owner to bachelordb_user;

create table meetings
(
    id          uuid                     not null
        primary key,
    divisionid  uuid                     not null
        constraint fk_meetings_division
            references division
            on delete cascade,
    title       text                     not null,
    startsatutc timestamp with time zone not null,
    status      integer default 0        not null,
    meetingcode text,
    started     integer default 0
);

alter table meetings
    owner to bachelordb_user;

create index ix_meetings_division
    on meetings (divisionid);

create unique index ux_meetings_meetingcode
    on meetings (meetingcode)
    where (meetingcode IS NOT NULL);

create table agendaitems
(
    id          uuid not null
        primary key,
    meetingid   uuid not null
        constraint fk_agendaitems_meeting
            references meetings
            on delete cascade,
    title       text not null,
    description text
);

alter table agendaitems
    owner to bachelordb_user;

create index ix_agendaitems_meeting
    on agendaitems (meetingid);

create table propositions
(
    id           uuid not null
        primary key,
    agendaitemid uuid not null
        constraint fk_propositions_agendaitems
            references agendaitems
            on delete cascade,
    question     text not null,
    votetype     text not null
);

alter table propositions
    owner to bachelordb_user;

create index ix_props_agendaitem
    on propositions (agendaitemid);

create table voteoptions
(
    id            uuid not null
        primary key,
    propositionid uuid not null
        constraint fk_voteoptions_propositions
            references propositions
            on delete cascade,
    label         text not null
);

alter table voteoptions
    owner to bachelordb_user;

create index ix_voteoptions_prop
    on voteoptions (propositionid);

create table admissiontickets
(
    id        uuid                  not null
        primary key,
    meetingid uuid                  not null
        constraint fk_admissiontickets_meetings
            references meetings
            on delete cascade,
    code      text                  not null
        unique,
    used      boolean default false not null
);

alter table admissiontickets
    owner to bachelordb_user;

create index ix_tickets_meeting
    on admissiontickets (meetingid);

create table ballots
(
    id                uuid                     not null
        primary key,
    admissionticketid uuid                     not null
        constraint fk_ballots_tickets
            references admissiontickets,
    propositionid     uuid                     not null
        constraint fk_ballots_propositions
            references propositions,
    voteoptionid      uuid                     not null
        constraint fk_ballots_voteoptions
            references voteoptions,
    castatutc         timestamp with time zone not null
);

alter table ballots
    owner to bachelordb_user;

create index ix_ballots_ticket
    on ballots (admissionticketid);

create index ix_ballots_prop
    on ballots (propositionid);

create index ix_ballots_option
    on ballots (voteoptionid);

create table votes
(
    id           uuid                                   not null
        primary key,
    ballotid     uuid                                   not null
        unique
        constraint fk_votes_ballots
            references ballots,
    createdatutc timestamp with time zone default now() not null
);

alter table votes
    owner to bachelordb_user;

create table auditableevents
(
    id           uuid                                   not null
        primary key,
    voteid       uuid                                   not null
        unique
        constraint fk_auditableevents_votes
            references votes,
    eventtype    text                                   not null,
    metadata     text,
    timestamputc timestamp with time zone default now() not null
);

alter table auditableevents
    owner to bachelordb_user;

create table votation
(
    id            uuid                     not null
        constraint votation_pk
            primary key,
    meetingid     uuid                     not null
        constraint votation_meetings_id_fk
            references meetings,
    propositionid uuid                     not null
        constraint votation_propositions_id_fk
            references propositions,
    startedatutc  timestamp with time zone not null,
    endedatutc    timestamp with time zone,
    open          boolean default false,
    overwritten   boolean default false    not null
);

alter table votation
    owner to bachelordb_user;

