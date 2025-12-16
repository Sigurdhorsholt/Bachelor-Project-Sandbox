using Application.Domain.Entities;
using Application.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Meetings.Commands;

public record StartMeetingCommand(Guid Id) : IRequest<StartMeetingResult>;

public record StartMeetingResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public bool AlreadyStarted { get; init; }
    public Guid MeetingId { get; init; }
    public int NewState { get; init; }
}

public class StartMeetingCommandHandler : IRequestHandler<StartMeetingCommand, StartMeetingResult>
{
    private readonly AppDbContext _db;

    public StartMeetingCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<StartMeetingResult> Handle(StartMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings
            .AsTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (meeting is null)
        {
            return new StartMeetingResult { Success = false, ErrorMessage = "Meeting not found" };
        }

        var startedValue = (int)MeetingStarted.Started;
        if (meeting.Started == startedValue)
        {
            return new StartMeetingResult
            {
                Success = true,
                AlreadyStarted = true,
                MeetingId = meeting.Id,
                NewState = meeting.Started
            };
        }

        meeting.Started = startedValue;
        await _db.SaveChangesAsync(cancellationToken);

        return new StartMeetingResult
        {
            Success = true,
            AlreadyStarted = false,
            MeetingId = meeting.Id,
            NewState = meeting.Started
        };
    }
}
