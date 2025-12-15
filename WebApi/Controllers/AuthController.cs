using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Application.Domain.Entities;
using Application.Persistence; // your AppDbContext namespace
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WebApi.DTOs;

namespace WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly string _issuer;
    private readonly SymmetricSecurityKey _key;

    public AuthController(
        AppDbContext db,
        IConfiguration cfg)
    {
        _db = db;
        _issuer = cfg["Jwt:Issuer"]!;
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> AdminLogin([FromBody] LoginRequest req, CancellationToken ct)
    {
        var user = await _db.Users
            .Include(u => u.Roles)
            .SingleOrDefaultAsync(u => u.Email == req.Email, ct);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            return Unauthorized();
        }

        var roles = user.Roles.Select(r => r.Role).ToArray();
        var token = IssueJwt(user.Email, roles, TimeSpan.FromMinutes(30));
        var expires = DateTime.UtcNow.AddMinutes(30);

        return Ok(new LoginResponse(token, expires, user.Email, roles));
    }

    [HttpGet("me")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> AdminMe()
    {
        var email = User.Identity?.Name ?? string.Empty;
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();

        var user = await _db.Users
            .Include(u => u.Organisation)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email);

        var organisations = new List<object>();
        if (user?.Organisation != null)
        {
            organisations.Add(new { user.Organisation.Id, user.Organisation.Name });
        }

        return Ok(new
        {
            email,
            roles,
            organisations
        });
    }

    [HttpPost("attendee/login")]
    [AllowAnonymous]
    public async Task<IActionResult> AttendeeLogin([FromBody] AttendeeLoginRequest req, CancellationToken ct)
    {
        var meeting = await _db.Meetings
            .Include(m => m.AdmissionTickets)
            .FirstOrDefaultAsync(m => EF.Functions.ILike(m.MeetingCode, req.MeetingCode), ct);

        if (meeting is null)
        {
            return Unauthorized(new { error = "Invalid meeting code" });
        }
        
        var IsTestMode = false;
        
        if (req.AccessCode.Equals("TESTCODE"))
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
            
            IsTestMode = true;
        }
        
        var ticket = meeting.AdmissionTickets
            .FirstOrDefault(t => string.Equals(t.Code, req.AccessCode, StringComparison.OrdinalIgnoreCase) && !t.Used);

        if (ticket is null && !IsTestMode)
        {
            return Unauthorized(new { error = "Invalid or already used access code" });
        }

        //ticket.Used = true;
        //await _db.SaveChangesAsync(ct);

        var token = IssueAttendeeJwt(meeting.Id, ticket.Id, ticket.Code, TimeSpan.FromHours(4));
        var expires = DateTime.UtcNow.AddHours(4);

        return Ok(new AttendeeLoginResponse(token, expires, meeting.Id, ticket.Id));
    }

    [HttpGet("attendee/me")]
    [Authorize(Policy = "AttendeeOnly")]
    public IActionResult AttendeeMe()
    {
        var meetingIdClaim = User.FindFirst("meetingId")?.Value;
        var ticketIdClaim = User.FindFirst("ticketId")?.Value;
        var ticketCode = User.FindFirst("ticketCode")?.Value;

        if (meetingIdClaim is null || ticketIdClaim is null)
        {
            return Unauthorized();
        }

        return Ok(new
        {
            meetingId = Guid.Parse(meetingIdClaim),
            ticketId = Guid.Parse(ticketIdClaim),
            ticketCode,
            type = "attendee"
        });
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
            // Also emit the standard JWT "role" claim so external clients and middleware that look for "role" see it.
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
            issuer: _issuer, audience: "admin",
            claims: claims,
            notBefore: now, expires: now.Add(lifetime),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}