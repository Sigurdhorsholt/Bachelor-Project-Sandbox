namespace Application.Domain.Entities;

public class Ballot
{
    public Guid Id { get; set; }
    public Guid AdmissionTicketId { get; set; }
    public Guid VotationId { get; set; }
    public Guid VoteOptionId { get; set; }
    public DateTime CastAtUtc { get; set; } = DateTime.UtcNow;

    public AdmissionTicket AdmissionTicket { get; set; } = null!;
    public Votation Votation { get; set; } = null!;
    public VoteOption VoteOption { get; set; } = null!;
    public Vote Vote { get; set; } = null!;
}