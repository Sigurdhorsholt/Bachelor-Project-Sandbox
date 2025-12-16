namespace Application.Services;

public record LoginResponse(string AccessToken, DateTime ExpiresAt, string Email, string[] Roles);
public record AttendeeLoginResponse(string AccessToken, DateTime ExpiresAt, Guid MeetingId, Guid TicketId);

