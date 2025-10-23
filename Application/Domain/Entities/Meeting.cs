namespace Application.Domain.Entities;

public enum MeetingStatus
{
    Draft = 0,
    Scheduled = 1,
    Published = 2,
    Finished = 3
}
public class Meeting
{
    public Guid Id { get; set; }
    public Guid DivisionId { get; set; }
    public string Title { get; set; } = "";
    public DateTime StartsAtUtc { get; set; }
    public MeetingStatus Status { get; set; } = MeetingStatus.Draft;
    public string MeetingCode { get; set; } = "";


    public Division Division { get; set; } = null!;
    public ICollection<AgendaItem> AgendaItems { get; set; } = new List<AgendaItem>();
    public ICollection<AdmissionTicket> AdmissionTickets { get; set; } = new List<AdmissionTicket>();
}