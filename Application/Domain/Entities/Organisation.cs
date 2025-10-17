namespace Application.Domain.Entities;

public class Organisation
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public ICollection<Division> Divisions { get; set; } = new List<Division>();
    public ICollection<User> Users { get; set; } = new List<User>();
}