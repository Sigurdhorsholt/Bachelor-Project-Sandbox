using System.Security.Cryptography;
using Application.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Application.Services;

public class MeetingCodeService : IMeetingCodeService
{
    private readonly AppDbContext _dbContext;
    private static readonly char[] Alph = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();
    private readonly int _length = 6;

    public MeetingCodeService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<string> GenerateUniqueCodeAsync(CancellationToken cancellationToken = default)
    {
        while (true)
        {
            var code = GenerateCode();
            var exists = await _dbContext.Meetings.AnyAsync(m => m.MeetingCode == code, cancellationToken);
            if (!exists) return code;
        }
    }

    private string GenerateCode()
    {
        Span<byte> bytes = stackalloc byte[_length];
        RandomNumberGenerator.Fill(bytes);
        var chars = new char[_length];
        for (int i = 0; i < _length; i++)
        {
            // map byte to index
            chars[i] = Alph[bytes[i] % Alph.Length];
        }
        return new string(chars);
    }
}
