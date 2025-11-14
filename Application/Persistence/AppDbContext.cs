using Application.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata; // <= needed for StoreObjectIdentifier

namespace Application.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // DbSets (unchanged)
    public DbSet<Organisation> Organisations => Set<Organisation>();
    public DbSet<Division> Divisions => Set<Division>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<AgendaItem> AgendaItems => Set<AgendaItem>();
    public DbSet<Proposition> Propositions => Set<Proposition>();
    public DbSet<VoteOption> VoteOptions => Set<VoteOption>();
    public DbSet<AdmissionTicket> AdmissionTickets => Set<AdmissionTicket>();
    public DbSet<Ballot> Ballots => Set<Ballot>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<AuditableEvent> AuditableEvents => Set<AuditableEvent>();
    public DbSet<Votation> Votations => Set<Votation>();


    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // Use default 'public' schema
        b.HasDefaultSchema("public");

        // 1) Map each entity to its lowercase table
        b.Entity<Organisation>().ToTable("organisation");
        b.Entity<Division>().ToTable("division");
        b.Entity<User>().ToTable("users");
        b.Entity<UserRole>().ToTable("userroles");
        b.Entity<Meeting>().ToTable("meetings");
        b.Entity<AgendaItem>().ToTable("agendaitems");
        b.Entity<Proposition>().ToTable("propositions");
        b.Entity<VoteOption>().ToTable("voteoptions");
        b.Entity<AdmissionTicket>().ToTable("admissiontickets");
        b.Entity<Ballot>().ToTable("ballots");
        b.Entity<Vote>().ToTable("votes");
        b.Entity<AuditableEvent>().ToTable("auditableevents");
        b.Entity<Votation>().ToTable("votation");

        // indexes/uniques you rely on
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<AdmissionTicket>().HasIndex(x => x.Code).IsUnique();
        b.Entity<Vote>().HasIndex(v => v.BallotId).IsUnique();
        b.Entity<AuditableEvent>().HasIndex(a => a.VoteId).IsUnique();

        // relationships (same as before)
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
        
        b.Entity<Meeting>().Property(m => m.Status)
            .HasConversion<int>()
            .HasDefaultValue(MeetingStatus.Draft);

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
            .HasOne(bal => bal.Votation)
            .WithMany(v => v.Ballots)
            .HasForeignKey(bal => bal.VotationId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Ballot>()
            .HasOne(bal => bal.VoteOption)
            .WithMany()
            .HasForeignKey(bal => bal.VoteOptionId);

        b.Entity<Vote>()
            .HasOne(v => v.Ballot)
            .WithOne(bal => bal.Vote)
            .HasForeignKey<Vote>(v => v.BallotId);

        b.Entity<AuditableEvent>()
            .HasOne(a => a.Vote)
            .WithOne(v => v.AuditableEvent)
            .HasForeignKey<AuditableEvent>(a => a.VoteId);
        
        b.Entity<Votation>()
            .HasOne(v => v.Meeting)
            .WithMany(m => m.Votations)
            .HasForeignKey(v => v.MeetingId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Votation>()
            .HasOne(v => v.Proposition)
            .WithMany(p => p.Votations)
            .HasForeignKey(v => v.PropositionId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Entity<Votation>().Property(v => v.Open).HasDefaultValue(false);
        b.Entity<Votation>().Property(v => v.Overwritten).HasDefaultValue(false);

        // 2) Make **all column names** lowercase to match your physical columns
        foreach (var entity in b.Model.GetEntityTypes())
        {
            var table = entity.GetTableName();
            var schema = entity.GetSchema();
            if (table is null) continue;

            foreach (var prop in entity.GetProperties())
            {
                // figure out current store column name and force lowercase
                var storeObject = StoreObjectIdentifier.Table(table, schema);
                var current = prop.GetColumnName(storeObject);
                if (!string.IsNullOrEmpty(current))
                    prop.SetColumnName(current!.ToLowerInvariant());
            }
        }
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.EnableSensitiveDataLogging(); // dev-only
}
