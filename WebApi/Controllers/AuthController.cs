using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Application.Persistence; // your AppDbContext namespace
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

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

    public record LoginRequest(string Email, string Password);

    public record LoginResponse(string AccessToken, DateTime ExpiresAt, string Email, string[] Roles);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var user = await _db.Users
            .Include(u => u.Roles)
            .SingleOrDefaultAsync(u => u.Email == req.Email, ct);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized();

        var roles = user.Roles.Select(r => r.Role).ToArray();
        var token = IssueJwt(user.Email, roles, TimeSpan.FromMinutes(30));
        var expires = DateTime.UtcNow.AddMinutes(30);

        return Ok(new LoginResponse(token, expires, user.Email, roles));
    }

   /* [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var email = User.Identity?.Name ?? "";
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
        return Ok(new { email, roles });
    }
    */
   
   [HttpGet("me")]
   [Authorize]
   public async Task<IActionResult> Me()
   {
       var email = User.Identity?.Name ?? "";
       var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();

       // TODO: Adjust to your actual user/org model.
       // Assuming User has OrganisationId (single org). If many-to-many, join the link table.
       var user = await _db.Users
           .Include(u => u.Organisation)
           .AsNoTracking()
           .FirstOrDefaultAsync(u => u.Email == email);

       //TODO: Replace Object with a proper DTO class
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
           // If you add more fields later, keep this the canonical shape for the FE.
       });
   }

   
   

    private string IssueJwt(string email, string[] roles, TimeSpan lifetime)
    {
        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;
        var claims = new List<Claim> { new(ClaimTypes.Name, email) };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var jwt = new JwtSecurityToken(
            issuer: _issuer, audience: null,
            claims: claims,
            notBefore: now, expires: now.Add(lifetime),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}