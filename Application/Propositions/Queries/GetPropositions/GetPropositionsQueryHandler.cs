using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;

namespace Application.Propositions.Queries.GetPropositions;

public record GetPropositionsQuery(Guid MeetingId, Guid ItemId, bool IncludeVoteOptions, bool IncludeVotations) : IRequest<List<PropositionDto>>;
public record PropositionDto(Guid Id, string Question, string VoteType, List<VoteOptionDto>? VoteOptions = null, List<VotationDto>? Votations = null, bool IsOpen = false);
public record VoteOptionDto(Guid Id, string Label);
public record VotationDto(Guid Id, Guid MeetingId, Guid PropositionId, DateTime? StartedAtUtc, DateTime? EndedAtUtc, bool Open, bool Overwritten);

public class GetPropositionsQueryHandler : IRequestHandler<GetPropositionsQuery, List<PropositionDto>>
{
    private readonly AppDbContext _db;

    public GetPropositionsQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<PropositionDto>> Handle(GetPropositionsQuery request, CancellationToken cancellationToken)
    {
        var agendaExists = await _db.AgendaItems.AnyAsync(a => a.Id == request.ItemId && a.MeetingId == request.MeetingId, cancellationToken);
        if (!agendaExists)
        {
            throw new KeyNotFoundException("Agenda item not found.");
        }

        if (!request.IncludeVoteOptions && !request.IncludeVotations)
        {
            var simple = await _db.Propositions
                .Where(p => p.AgendaItemId == request.ItemId)
                .AsNoTracking()
                .Select(p => new PropositionDto(p.Id, p.Question, p.VoteType, null, null, false))
                .ToListAsync(cancellationToken);

            return simple;
        }

        var query = _db.Propositions
            .Where(p => p.AgendaItemId == request.ItemId)
            .AsNoTracking();

        if (request.IncludeVoteOptions)
        {
            query = query.Include(p => p.Options);
        }

        if (request.IncludeVotations)
        {
            query = query.Include(p => p.Votations.Where(v => v.MeetingId == request.MeetingId));
        }

        // Materialize entities first, then map to DTOs in-memory to avoid EF translation issues
        var entities = await query.ToListAsync(cancellationToken);

        var detailed = entities.Select(p => new PropositionDto(
            p.Id,
            p.Question,
            p.VoteType,
            request.IncludeVoteOptions ? p.Options?.Select(o => new VoteOptionDto(o.Id, o.Label)).ToList() : null,
            request.IncludeVotations ? p.Votations?.Where(v => v.MeetingId == request.MeetingId).Select(v => new VotationDto(v.Id, v.MeetingId, v.PropositionId, v.StartedAtUtc, v.EndedAtUtc, v.Open, v.Overwritten)).ToList() : null,
            request.IncludeVotations && (p.Votations != null && p.Votations.Any(v => v.Open))
        )).ToList();

        return detailed;
    }
}
