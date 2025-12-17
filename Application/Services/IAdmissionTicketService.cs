namespace Application.Services;

public record AdmissionTicketDto(Guid Id, string Code, bool Used, string? IssuedTo = null);

public interface IAdmissionTicketService
{
    Task<List<AdmissionTicketDto>> GetForMeetingAsync(Guid meetingId, CancellationToken cancellationToken = default);
    Task GenerateAsync(Guid meetingId, int count, CancellationToken cancellationToken = default);
    Task ClearAsync(Guid meetingId, CancellationToken cancellationToken = default);
    Task ReplaceAsync(Guid meetingId, int count, CancellationToken cancellationToken = default);
    Task CreateWithCodeAsync(Guid meetingId, string code, CancellationToken cancellationToken = default);
}
