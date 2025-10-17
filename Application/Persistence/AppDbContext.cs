using Application.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Application.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // Org
    public DbSet<Organisation> Organisations => Set<Organisation>();
    public DbSet<Division> Divisions => Set<Division>();

    // Users
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();

    // Meetings flow
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<AgendaItem> AgendaItems => Set<AgendaItem>();
    public DbSet<Proposition> Propositions => Set<Proposition>();
    public DbSet<VoteOption> VoteOptions => Set<VoteOption>();
    public DbSet<AdmissionTicket> AdmissionTickets => Set<AdmissionTicket>();
    public DbSet<Ballot> Ballots => Set<Ballot>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<AuditableEvent> AuditableEvents => Set<AuditableEvent>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Minimal keys/uniques you relied on in SQL
        b.Entity<Organisation>().ToTable("Organisation");
        b.Entity<Division>().ToTable("Division");

        b.Entity<User>().ToTable("Users")
            .HasIndex(u => u.Email).IsUnique();

        b.Entity<UserRole>().ToTable("UserRoles");

        b.Entity<Meeting>().ToTable("Meetings");
        b.Entity<AgendaItem>().ToTable("AgendaItems");
        b.Entity<Proposition>().ToTable("Propositions");
        b.Entity<VoteOption>().ToTable("VoteOptions");
        b.Entity<AdmissionTicket>().ToTable("AdmissionTickets")
            .HasIndex(x => x.Code).IsUnique();

        b.Entity<Ballot>().ToTable("Ballots");
        b.Entity<Vote>().ToTable("Votes")
            .HasIndex(v => v.BallotId).IsUnique();

        b.Entity<AuditableEvent>().ToTable("AuditableEvents")
            .HasIndex(a => a.VoteId).IsUnique();

        // Optional: relationships if not using data annotations
        b.Entity<Division>()
            .HasOne(d => d.Organisation)
            .WithMany(o => o.Divisions)
            .HasForeignKey(d => d.OrganisationId);

        b.Entity<User>()
            .HasOne(u => u.Organisation)
            .WithMany(o => o.Users)
            .HasForeignKey(u => u.OrganisationId);

        b.Entity<UserRole>()
            .HasOne(r => r.User)
            .WithMany(u => u.Roles)
            .HasForeignKey(r => r.UserId);

        b.Entity<Meeting>()
            .HasOne(m => m.Division)
            .WithMany(d => d.Meetings)
            .HasForeignKey(m => m.DivisionId);

        b.Entity<AgendaItem>()
            .HasOne(a => a.Meeting)
            .WithMany(m => m.AgendaItems)
            .HasForeignKey(a => a.MeetingId);

        b.Entity<Proposition>()
            .HasOne(p => p.AgendaItem)
            .WithMany(a => a.Propositions)
            .HasForeignKey(p => p.AgendaItemId);

        b.Entity<VoteOption>()
            .HasOne(o => o.Proposition)
            .WithMany(p => p.Options)
            .HasForeignKey(o => o.PropositionId);

        b.Entity<AdmissionTicket>()
            .HasOne(t => t.Meeting)
            .WithMany(m => m.AdmissionTickets)
            .HasForeignKey(t => t.MeetingId);

        b.Entity<Ballot>()
            .HasOne(bal => bal.AdmissionTicket)
            .WithMany(t => t.Ballots)
            .HasForeignKey(bal => bal.AdmissionTicketId);

        b.Entity<Ballot>()
            .HasOne(bal => bal.Proposition)
            .WithMany()
            .HasForeignKey(bal => bal.PropositionId);

        b.Entity<Ballot>()
            .HasOne(bal => bal.VoteOption)
            .WithMany()
            .HasForeignKey(bal => bal.VoteOptionId);

        b.Entity<Vote>()
            .HasOne(v => v.Ballot)
            .WithOne(b => b.Vote)
            .HasForeignKey<Vote>(v => v.BallotId);

        b.Entity<AuditableEvent>()
            .HasOne(a => a.Vote)
            .WithOne(v => v.AuditableEvent)
            .HasForeignKey<AuditableEvent>(a => a.VoteId);
    }

    // Enforce FK in SQLite (safety if not set in connection string)
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.EnableSensitiveDataLogging(); // dev-only
}
