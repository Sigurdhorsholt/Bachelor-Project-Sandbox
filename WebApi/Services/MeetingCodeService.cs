// filepath: c:\Users\sigur\Documents\GitHub\Bachelor-Project-Sandbox\WebApi\Services\MeetingCodeService.cs
using Application.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using WebApi.DTOs;
using Application.Domain.Entities;

namespace WebApi.Services;

public class MeetingCodeService : IMeetingCodeService
{
    private readonly AppDbContext _db;
    private static readonly char[] Alph = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();
    private readonly int _length = 6;

    public MeetingCodeService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<string> GenerateUniqueCodeAsync(CancellationToken cancellationToken = default)
    {
        while (true)
        {
            var code = GenerateCode();
            var exists = await _db.Meetings.AnyAsync(m => m.MeetingCode == code, cancellationToken);
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
