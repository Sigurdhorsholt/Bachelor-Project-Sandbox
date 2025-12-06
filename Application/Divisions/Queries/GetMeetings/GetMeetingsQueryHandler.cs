using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;

namespace Application.Divisions.Queries.GetMeetings;

public record GetMeetingsQuery(Guid DivisionId) : IRequest<List<MeetingListDto>>;
public record MeetingListDto(Guid Id, string Title, DateTime StartsAtUtc, string Status);

public class GetMeetingsQueryHandler : IRequestHandler<GetMeetingsQuery, List<MeetingListDto>>
{
    private readonly AppDbContext _db;

    public GetMeetingsQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<MeetingListDto>> Handle(GetMeetingsQuery request, CancellationToken cancellationToken)
    {
        var exists = await _db.Divisions.AnyAsync(d => d.Id == request.DivisionId, cancellationToken);
        if (!exists)
        {
            throw new KeyNotFoundException("Division not found.");
        }

        var items = await _db.Meetings
            .Where(m => m.DivisionId == request.DivisionId)
            .OrderBy(m => m.StartsAtUtc)
            .AsNoTracking()
            .Select(m => new MeetingListDto(m.Id, m.Title, m.StartsAtUtc, m.Status.ToString()))
            .ToListAsync(cancellationToken);

        return items;
    }
}

