using Application.Services;
using System;

namespace WebApi.DTOs
{
    public record LoginRequest(string Email, string Password);
    // LoginResponse is now in Application.Services
    
    public record AttendeeLoginRequest(string MeetingCode, string AccessCode);
    // AttendeeLoginResponse is now in Application.Services
}
