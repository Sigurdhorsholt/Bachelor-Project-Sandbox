namespace Application.Domain.Entities;

public class Division
{
    public Guid Id { get; set; }
    public Guid OrganisationId { get; set; }
    public string Name { get; set; } = null!;

    public Organisation Organisation { get; set; } = null!;
    public ICollection<Meeting> Meetings { get; set; } = new List<Meeting>();
}