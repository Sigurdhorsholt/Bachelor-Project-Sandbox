namespace Application.Domain.Entities;

public class Proposition
{
    public Guid Id { get; set; }
    public Guid AgendaItemId { get; set; }
    public string Question { get; set; } = "";
    public string VoteType { get; set; } = "YesNoBlank"; // simplified

    public AgendaItem AgendaItem { get; set; } = null!;
    public ICollection<VoteOption> Options { get; set; } = new List<VoteOption>();
}