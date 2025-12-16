using Application.Domain.Entities;
using Application.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Meetings.Queries;

public record GetMeetingByIdQuery(Guid Id) : IRequest<GetMeetingByIdResult?>;

public record GetMeetingByIdResult(
    Guid Id,
    Guid DivisionId,
    string Title,
    DateTime StartsAtUtc,
    string Status,
    string MeetingCode,
    int Started
);

public class GetMeetingByIdQueryHandler : IRequestHandler<GetMeetingByIdQuery, GetMeetingByIdResult?>
{
    private readonly AppDbContext _db;

    public GetMeetingByIdQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<GetMeetingByIdResult?> Handle(GetMeetingByIdQuery request, CancellationToken cancellationToken)
    {
        var m = await _db.Meetings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (m is null)
        {
            return null;
        }

        return new GetMeetingByIdResult(
            m.Id,
            m.DivisionId,
            m.Title,
            m.StartsAtUtc,
            m.Status.ToString(),
            m.MeetingCode,
            m.Started
        );
    }
}

