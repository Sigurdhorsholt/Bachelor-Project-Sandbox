namespace Application.Domain.Entities;

public class AuditableEvent
{
    public Guid Id { get; set; }
    public Guid VoteId { get; set; }
    public string EventType { get; set; } = "VoteCast"; // later: VoteChanged, VoteRevoked
    public string? Metadata { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;

    public Vote Vote { get; set; } = null!;
}