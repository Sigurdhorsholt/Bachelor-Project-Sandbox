
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;

namespace Application.Agendas.Queries.GetAgendaSimple;

public record GetAgendaSimpleQuery(Guid MeetingId) : IRequest<List<SimpleAgendaItemDto>>;
public record SimpleAgendaItemDto(Guid Id, string Title, string? Description);

public class GetAgendaSimpleQueryHandler : IRequestHandler<GetAgendaSimpleQuery, List<SimpleAgendaItemDto>>
{
    private readonly AppDbContext _db;
    public GetAgendaSimpleQueryHandler(AppDbContext db) => _db = db;

    public async Task<List<SimpleAgendaItemDto>> Handle(GetAgendaSimpleQuery request, CancellationToken cancellationToken)
    {
        var exists = await _db.Meetings.AnyAsync(m => m.Id == request.MeetingId, cancellationToken);
        if (!exists) throw new KeyNotFoundException("Meeting not found.");

        var items = await _db.AgendaItems
            .Where(a => a.MeetingId == request.MeetingId)
            .AsNoTracking()
            .Select(a => new SimpleAgendaItemDto(a.Id, a.Title, a.Description))
            .ToListAsync(cancellationToken);

        return items;
    }
}
