using System.Security.Cryptography;
using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Application.Services;

public class AdmissionTicketService : IAdmissionTicketService
{
    private readonly AppDbContext _dbContext;
    private static readonly char[] Alph = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();
    private readonly int _length = 8;

    public AdmissionTicketService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<AdmissionTicketDto>> GetForMeetingAsync(Guid meetingId, CancellationToken cancellationToken = default)
    {
        var tickets = await _dbContext.AdmissionTickets
            .AsNoTracking()
            .Where(t => t.MeetingId == meetingId)
            .Select(t => new AdmissionTicketDto(t.Id, t.Code, t.Used, null))
            .ToListAsync(cancellationToken);

        return tickets;
    }

    public async Task GenerateAsync(Guid meetingId, int count, CancellationToken cancellationToken = default)
    {
        if (count <= 0) return;

        // Ensure meeting exists
        var meetingExists = await _dbContext.Meetings.AnyAsync(m => m.Id == meetingId, cancellationToken);
        if (!meetingExists) throw new InvalidOperationException("Meeting not found");

        var created = new List<AdmissionTicket>();

        while (created.Count < count)
        {
            var code = GenerateCode();
            var exists = await _dbContext.AdmissionTickets.AnyAsync(t => t.Code == code, cancellationToken);
            if (exists) continue;
            var ticket = new AdmissionTicket { Id = Guid.NewGuid(), MeetingId = meetingId, Code = code, Used = false };
            created.Add(ticket);
            _dbContext.Add(ticket);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ClearAsync(Guid meetingId, CancellationToken cancellationToken = default)
    {
        var toDelete = await _dbContext.AdmissionTickets
            .Where(t => t.MeetingId == meetingId)
            .ToListAsync(cancellationToken);
        if (toDelete.Count == 0) return;
        _dbContext.RemoveRange(toDelete);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task ReplaceAsync(Guid meetingId, int count, CancellationToken cancellationToken = default)
    {
        if (count < 0) throw new ArgumentOutOfRangeException(nameof(count));

        // Use a transaction to make clear+generate atomic
        using var tx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        await ClearAsync(meetingId, cancellationToken);
        if (count > 0)
            await GenerateAsync(meetingId, count, cancellationToken);
        await tx.CommitAsync(cancellationToken);
    }

    private string GenerateCode()
    {
        Span<byte> bytes = stackalloc byte[_length];
        RandomNumberGenerator.Fill(bytes);
        var chars = new char[_length];
        for (int i = 0; i < _length; i++)
        {
            chars[i] = Alph[bytes[i] % Alph.Length];
        }
        return new string(chars);
    }
}
