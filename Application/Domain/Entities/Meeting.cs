namespace Application.Domain.Entities;

public class Meeting
{
    public Guid Id { get; set; }
    public Guid DivisionId { get; set; }
    public string Title { get; set; } = "";
    public DateTime StartsAtUtc { get; set; }

    public Division Division { get; set; } = null!;
    public ICollection<AgendaItem> AgendaItems { get; set; } = new List<AgendaItem>();
    public ICollection<AdmissionTicket> AdmissionTickets { get; set; } = new List<AdmissionTicket>();
}