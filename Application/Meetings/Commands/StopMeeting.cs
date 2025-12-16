using Application.Domain.Entities;
using Application.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Meetings.Commands;

public record StopMeetingCommand(Guid Id) : IRequest<StopMeetingResult>;

public record StopMeetingResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public bool AlreadyStopped { get; init; }
    public Guid MeetingId { get; init; }
    public int NewState { get; init; }
}

public class StopMeetingCommandHandler : IRequestHandler<StopMeetingCommand, StopMeetingResult>
{
    private readonly AppDbContext _db;

    public StopMeetingCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<StopMeetingResult> Handle(StopMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings
            .AsTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (meeting is null)
        {
            return new StopMeetingResult { Success = false, ErrorMessage = "Meeting not found" };
        }

        var stoppedValue = (int)MeetingStarted.NotStarted;
        if (meeting.Started == stoppedValue)
        {
            return new StopMeetingResult
            {
                Success = true,
                AlreadyStopped = true,
                MeetingId = meeting.Id,
                NewState = meeting.Started
            };
        }

        meeting.Started = stoppedValue;
        await _db.SaveChangesAsync(cancellationToken);

        return new StopMeetingResult
        {
            Success = true,
            AlreadyStopped = false,
            MeetingId = meeting.Id,
            NewState = meeting.Started
        };
    }
}
