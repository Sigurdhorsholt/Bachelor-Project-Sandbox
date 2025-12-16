using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Application.Domain.Entities;
using Application.Persistence;
using Application.Services;
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
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> AdminLogin([FromBody] LoginRequest req, CancellationToken ct)
    {
        var result = await _authService.AdminLoginAsync(req.Email, req.Password, ct);
        
        if (result is null)
        {
            return Unauthorized();
        }

        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> AdminMe()
    {
        var email = User.Identity?.Name ?? string.Empty;
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();

        var (userEmail, _, organisations) = await _authService.GetAdminMeAsync(email);

        return Ok(new
        {
            email = userEmail,
            roles,
            organisations
        });
    }

    [HttpPost("attendee/login")]
    [AllowAnonymous]
    public async Task<IActionResult> AttendeeLogin([FromBody] AttendeeLoginRequest req, CancellationToken ct)
    {
        var result = await _authService.AttendeeLoginAsync(req.MeetingCode, req.AccessCode, ct);
        
        if (result is null)
        {
            return Unauthorized(new { error = "Invalid meeting code or access code" });
        }

        return Ok(result);
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

        var (meetingId, ticketId, code) = _authService.GetAttendeeInfo(meetingIdClaim, ticketIdClaim, ticketCode ?? string.Empty);

        return Ok(new
        {
            meetingId,
            ticketId,
            ticketCode = code,
            type = "attendee"
        });
    }
}