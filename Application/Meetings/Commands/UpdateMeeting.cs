using Application.Domain.Entities;
using Application.Persistence;
using Application.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Meetings.Commands;

public record UpdateMeetingCommand(
    Guid Id,
    string? Title,
    DateTime? StartsAtUtc,
    MeetingStatus? Status,
    bool RegenerateMeetingCode
) : IRequest<UpdateMeetingResult>;

public record UpdateMeetingResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public UpdatedMeetingData? Data { get; init; }
}

public record UpdatedMeetingData(
    Guid Id,
    Guid DivisionId,
    string Title,
    DateTime StartsAtUtc,
    string Status,
    string MeetingCode,
    int Started,
    List<AgendaItemData> Agenda
);

public record AgendaItemData(
    Guid Id,
    string Title,
    string? Description,
    List<PropositionData> Propositions
);

public record PropositionData(
    Guid Id,
    string Question,
    string VoteType
);

public class UpdateMeetingCommandHandler : IRequestHandler<UpdateMeetingCommand, UpdateMeetingResult>
{
    private readonly AppDbContext _db;
    private readonly IMeetingCodeService _codeService;
    private readonly ILogger<UpdateMeetingCommandHandler> _logger;

    public UpdateMeetingCommandHandler(
        AppDbContext db,
        IMeetingCodeService codeService,
        ILogger<UpdateMeetingCommandHandler> logger)
    {
        _db = db;
        _codeService = codeService;
        _logger = logger;
    }

    public async Task<UpdateMeetingResult> Handle(UpdateMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings
            .Include(x => x.AgendaItems).ThenInclude(a => a.Propositions)
            .AsTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (meeting == null)
        {
            return new UpdateMeetingResult { Success = false, ErrorMessage = "Meeting not found" };
        }

        if (meeting.Status == MeetingStatus.Finished)
        {
            return new UpdateMeetingResult { Success = false, ErrorMessage = "Finished meetings cannot be edited." };
        }

        if (request.Title is not null)
        {
            var t = request.Title.Trim();
            if (t.Length == 0)
            {
                return new UpdateMeetingResult { Success = false, ErrorMessage = "Title cannot be empty." };
            }
            meeting.Title = t;
        }

        if (request.StartsAtUtc is not null)
        {
            var dt = DateTime.SpecifyKind(request.StartsAtUtc.Value, DateTimeKind.Utc);
            meeting.StartsAtUtc = dt;
        }

        if (request.Status is not null)
        {
            meeting.Status = request.Status.Value;
        }

        if (request.RegenerateMeetingCode)
        {
            try
            {
                var code = await _codeService.GenerateUniqueCodeAsync();
                meeting.MeetingCode = code;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to regenerate meeting code for {MeetingId}", request.Id);
                return new UpdateMeetingResult { Success = false, ErrorMessage = "Failed to generate meeting code" };
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        // Reload no tracking for clean output
        var updated = await _db.Meetings
            .Include(x => x.AgendaItems).ThenInclude(a => a.Propositions)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        var agendaData = updated!.AgendaItems.Select(a => new AgendaItemData(
            a.Id,
            a.Title,
            a.Description,
            a.Propositions.Select(p => new PropositionData(p.Id, p.Question, p.VoteType)).ToList()
        )).ToList();

        var meetingData = new UpdatedMeetingData(
            updated.Id,
            updated.DivisionId,
            updated.Title,
            updated.StartsAtUtc,
            updated.Status.ToString(),
            updated.MeetingCode,
            updated.Started,
            agendaData
        );

        return new UpdateMeetingResult { Success = true, Data = meetingData };
    }
}

