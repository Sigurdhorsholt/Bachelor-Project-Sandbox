using System;
using System.Text.Json.Serialization;
using Application.Domain.Entities;

namespace WebApi.DTOs
{
    public record CreateVoteOptionRequest(string Label);
    public record UpdateVoteOptionRequest(string? Label);

    public record CastVoteRequest(
        Guid MeetingId,
        Guid PropositionId,
        Guid VoteOptionId,
        string Code
    );

    public record CreatePropositionRequest(string Question, string VoteType);
    public record UpdatePropositionRequest(string? Question, string? VoteType);

    public record CreateOrganisationRequest(string Name);
    public record CreateDivisionRequest(string Name);

    public record CreateMeetingRequest(
        string Title,
        DateTime StartsAtUtc,
        [property: JsonConverter(typeof(JsonStringEnumConverter))] MeetingStatus Status
    );

    public record CreateAgendaItemRequest(string Title, string? Description);
    public record UpdateAgendaItemRequest(string? Title, string? Description);

    public record UpdateMeetingRequest
    {
        public string? Title { get; set; }
        public DateTime? StartsAtUtc { get; set; }
        public MeetingStatus? Status { get; set; }
        public bool? RegenerateMeetingCode { get; set; }
    }
}
