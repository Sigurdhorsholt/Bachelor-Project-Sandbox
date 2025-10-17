namespace Application.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public Guid OrganisationId { get; set; }
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Organisation Organisation { get; set; } = null!;
    public ICollection<UserRole> Roles { get; set; } = new List<UserRole>();
}

public class UserRole
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = null!; // Administrator, Moderator, Secretary, etc.

    public User User { get; set; } = null!;
}