using System;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Services;

public interface IAuthService
{
    Task<LoginResponse?> AdminLoginAsync(string email, string password, CancellationToken ct = default);
    Task<(string email, string[] roles, object[] organisations)> GetAdminMeAsync(string email, CancellationToken ct = default);
    Task<AttendeeLoginResponse?> AttendeeLoginAsync(string meetingCode, string accessCode, CancellationToken ct = default);
    (Guid meetingId, Guid ticketId, string ticketCode) GetAttendeeInfo(string meetingIdClaim, string ticketIdClaim, string ticketCode);
}
