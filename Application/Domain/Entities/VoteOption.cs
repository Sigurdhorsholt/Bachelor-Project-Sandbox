namespace Application.Domain.Entities;

public class VoteOption
{
    public Guid Id { get; set; }
    public Guid PropositionId { get; set; }
    public string Label { get; set; } = "";

    public Proposition Proposition { get; set; } = null!;
}