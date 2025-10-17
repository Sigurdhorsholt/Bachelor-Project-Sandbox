namespace Application.Domain.Entities;

public class AdmissionTicket
{
    public Guid Id { get; set; }
    public Guid MeetingId { get; set; }
    public string Code { get; set; } = null!;
    public bool Used { get; set; } = false;

    public Meeting Meeting { get; set; } = null!;
    public ICollection<Ballot> Ballots { get; set; } = new List<Ballot>();
}