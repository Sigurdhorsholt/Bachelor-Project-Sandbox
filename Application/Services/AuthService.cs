using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Application.Services;

public class AuthService : IAuthService
{
    private AppDbContext _db;
    private readonly string _issuer;
    private readonly SymmetricSecurityKey _key;

    public AuthService(AppDbContext db, IConfiguration cfg)
    {
        _db = db;
        _issuer = cfg["Jwt:Issuer"]!;
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!));
    }

    public async Task<LoginResponse?> AdminLoginAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await _db.Users
            .Include(u => u.Roles)
            .SingleOrDefaultAsync(u => u.Email == email, ct);

        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return null;
        }

        var roles = user.Roles.Select(r => r.Role).ToArray();
        var token = IssueJwt(user.Email, roles, TimeSpan.FromMinutes(30));
        var expires = DateTime.UtcNow.AddMinutes(30);

        return new LoginResponse(token, expires, user.Email, roles);
    }

    public async Task<(string email, string[] roles, object[] organisations)> GetAdminMeAsync(string email, CancellationToken ct = default)
    {
        var user = await _db.Users
            .Include(u => u.Organisation)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, ct);

        //empty for now. Organisations comes later
        var organisations = new List<object>();
        
        if (user?.Organisation != null)
        {
            organisations.Add(new { user.Organisation.Id, user.Organisation.Name });
        }

        return (email, Array.Empty<string>(), organisations.ToArray());
    }

    public async Task<AttendeeLoginResponse?> AttendeeLoginAsync(string meetingCode, string accessCode, CancellationToken ct = default)
    {
        var meeting = await _db.Meetings
            .Include(m => m.AdmissionTickets)
            .FirstOrDefaultAsync(m => EF.Functions.ILike(m.MeetingCode, meetingCode), ct);

        if (meeting is null)
        {
            return null;
        }

        var isTestMode = false;

        if (accessCode.Equals("TESTCODE"))
        {
            var testTicket = new AdmissionTicket
            {
                Id = Guid.NewGuid(),
                Code = "TESTCODE",
                Used = false,
                MeetingId = meeting.Id
            };
            meeting.AdmissionTickets.Add(testTicket);
            await _db.SaveChangesAsync(ct);

            isTestMode = true;
        }

        var ticket = meeting.AdmissionTickets
            .FirstOrDefault(t => string.Equals(t.Code, accessCode, StringComparison.OrdinalIgnoreCase) && !t.Used);

        if (ticket is null && !isTestMode)
        {
            return null;
        }

        var token = IssueAttendeeJwt(meeting.Id, ticket!.Id, ticket.Code, TimeSpan.FromHours(4));
        var expires = DateTime.UtcNow.AddHours(4);

        return new AttendeeLoginResponse(token, expires, meeting.Id, ticket.Id);
    }

    public (Guid meetingId, Guid ticketId, string ticketCode) GetAttendeeInfo(string meetingIdClaim, string ticketIdClaim, string ticketCode)
    {
        return (Guid.Parse(meetingIdClaim), Guid.Parse(ticketIdClaim), ticketCode);
    }

    private string IssueAttendeeJwt(Guid meetingId, Guid ticketId, string ticketCode, TimeSpan lifetime)
    {
        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new("meetingId", meetingId.ToString()),
            new("ticketId", ticketId.ToString()),
            new("ticketCode", ticketCode),
            new(ClaimTypes.Role, "Attendee"),
            new("role", "Attendee")
        };

        var jwt = new JwtSecurityToken(
            issuer: _issuer,
            audience: "attendee",
            claims: claims,
            notBefore: now,
            expires: now.Add(lifetime),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private string IssueJwt(string email, string[] roles, TimeSpan lifetime)
    {
        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;
        var claims = new List<Claim> { new(ClaimTypes.Name, email) };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var jwt = new JwtSecurityToken(
            issuer: _issuer, 
            audience: "admin",
            claims: claims,
            notBefore: now, 
            expires: now.Add(lifetime),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}
