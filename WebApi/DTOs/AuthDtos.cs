// ...existing code...
using System;

namespace WebApi.DTOs
{
    public record LoginRequest(string Email, string Password);
    public record LoginResponse(string AccessToken, DateTime ExpiresAt, string Email, string[] Roles);

    public record AttendeeLoginRequest(string MeetingCode, string AccessCode);
    public record AttendeeLoginResponse(string AccessToken, DateTime ExpiresAt, Guid MeetingId, Guid TicketId);
}

