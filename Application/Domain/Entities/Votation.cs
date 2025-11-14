namespace Application.Domain.Entities;

public class Votation
{
    public Guid Id { get; set; }

    public Guid MeetingId { get; set; }
    public Meeting? Meeting { get; set; }

    public Guid PropositionId { get; set; }
    public Proposition? Proposition { get; set; }

    public DateTime StartedAtUtc { get; set; }
    public DateTime? EndedAtUtc { get; set; }

    public bool Open { get; set; }
    public bool Overwritten { get; set; }

    public ICollection<Ballot> Ballots { get; set; } = new List<Ballot>();
}