namespace Application.Domain.Entities;

public class Vote
{
    public Guid Id { get; set; }
    public Guid BallotId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Ballot Ballot { get; set; } = null!;
    public AuditableEvent AuditableEvent { get; set; } = null!;
}