namespace Application.Domain.Entities;

public class AgendaItem
{
    public Guid Id { get; set; }
    public Guid MeetingId { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }

    public Meeting Meeting { get; set; } = null!;
    public ICollection<Proposition> Propositions { get; set; } = new List<Proposition>();
}