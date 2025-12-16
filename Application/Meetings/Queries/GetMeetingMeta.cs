using Application.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Meetings.Queries;

public record GetMeetingMetaQuery(string MeetingId) : IRequest<GetMeetingMetaResult?>;

public record GetMeetingMetaResult(
    Guid Id,
    string Title,
    DateTime StartsAtUtc,
    string Status,
    string MeetingCode,
    int Started
);

public class GetMeetingMetaQueryHandler : IRequestHandler<GetMeetingMetaQuery, GetMeetingMetaResult?>
{
    private readonly AppDbContext _db;

    public GetMeetingMetaQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<GetMeetingMetaResult?> Handle(GetMeetingMetaQuery request, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id.ToString() == request.MeetingId, cancellationToken);

        if (meeting == null)
        {
            return null;
        }

        return new GetMeetingMetaResult(
            meeting.Id,
            meeting.Title,
            meeting.StartsAtUtc,
            meeting.Status.ToString(),
            meeting.MeetingCode,
            meeting.Started
        );
    }
}

