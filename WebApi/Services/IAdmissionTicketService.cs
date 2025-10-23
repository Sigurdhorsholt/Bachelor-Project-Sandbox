using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace WebApi.Services;

public record AdmissionTicketDto(Guid Id, string Code, bool Used, string? IssuedTo = null);

public interface IAdmissionTicketService
{
    Task<List<AdmissionTicketDto>> GetForMeetingAsync(Guid meetingId, CancellationToken cancellationToken = default);
    Task GenerateAsync(Guid meetingId, int count, CancellationToken cancellationToken = default);
    Task ClearAsync(Guid meetingId, CancellationToken cancellationToken = default);
    Task ReplaceAsync(Guid meetingId, int count, CancellationToken cancellationToken = default);
}

