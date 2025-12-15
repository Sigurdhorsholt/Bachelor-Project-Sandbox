using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using System.Linq;

namespace Application.Agendas.Queries.GetAgenda;

public record GetAgendaQuery(Guid MeetingId, bool IncludePropositions) : IRequest<GetAgendaResult>;
public record GetAgendaResult(List<AgendaItemDto> Items);
public record AgendaItemDto(Guid Id, string Title, string? Description, List<PropositionDto>? Propositions = null);
public record PropositionDto(
    Guid Id,
    string Question,
    string VoteType,
    List<VoteOptionDto> VoteOptions,
    VotationDto? LatestVotation,
    bool IsOpen
);
public record VoteOptionDto(Guid Id, string Label);
public record VotationDto(
    Guid Id,
    Guid MeetingId,
    Guid PropositionId,
    DateTime? StartedAtUtc,
    DateTime? EndedAtUtc,
    bool Open,
    bool Overwritten
);

public class GetAgendaQueryHandler : IRequestHandler<GetAgendaQuery, GetAgendaResult>
{
    private readonly AppDbContext _db;
    public GetAgendaQueryHandler(AppDbContext db) => _db = db;

    public async Task<GetAgendaResult> Handle(GetAgendaQuery request, CancellationToken cancellationToken)
    {
        var exists = await _db.Meetings.AnyAsync(m => m.Id == request.MeetingId, cancellationToken);
        if (!exists) throw new KeyNotFoundException("Meeting not found.");

        if (!request.IncludePropositions)
        {
            var items = await _db.AgendaItems
                .Where(a => a.MeetingId == request.MeetingId)
                .AsNoTracking()
                .Select(a => new AgendaItemDto(a.Id, a.Title, a.Description, null))
                .ToListAsync(cancellationToken);

            return new GetAgendaResult(items);
        }

        var itemsWithPropositions = await _db.AgendaItems
            .Where(a => a.MeetingId == request.MeetingId)
            .Include(a => a.Propositions)
                .ThenInclude(p => p.Options)
            .Include(a => a.Propositions)
                .ThenInclude(p => p.Votations)
            .AsNoTracking()
            .Select(a => new AgendaItemDto(
                a.Id,
                a.Title,
                a.Description,
                a.Propositions.Select(p => new PropositionDto(
                    p.Id,
                    p.Question,
                    p.VoteType,
                    p.Options.Select(o => new VoteOptionDto(o.Id, o.Label)).ToList(),
                    // Select only the latest votation: order by StartedAtUtc desc, then EndedAtUtc desc
                    p.Votations
                        .OrderByDescending(v => v.StartedAtUtc)
                        .ThenByDescending(v => v.EndedAtUtc)
                        .Select(v => new VotationDto(
                            v.Id,
                            v.MeetingId,
                            v.PropositionId,
                            v.StartedAtUtc,
                            v.EndedAtUtc,
                            v.Open,
                            v.Overwritten
                        ))
                        .FirstOrDefault(),
                    // IsOpen should reflect the latest votation if present
                    p.Votations
                        .OrderByDescending(v => v.StartedAtUtc)
                        .ThenByDescending(v => v.EndedAtUtc)
                        .Select(v => v.Open)
                        .FirstOrDefault()
                )).ToList()
            ))
            .ToListAsync(cancellationToken);

        return new GetAgendaResult(itemsWithPropositions);
    }
}
