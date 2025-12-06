using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;

namespace Application.Organisations.Queries.GetDivisions;

public record GetDivisionsQuery(Guid OrganisationId) : IRequest<List<DivisionDto>>;
public record DivisionDto(Guid Id, string Name);

public class GetDivisionsQueryHandler : IRequestHandler<GetDivisionsQuery, List<DivisionDto>>
{
    private readonly AppDbContext _db;

    public GetDivisionsQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<DivisionDto>> Handle(GetDivisionsQuery request, CancellationToken cancellationToken)
    {
        var orgExists = await _db.Organisations.AnyAsync(o => o.Id == request.OrganisationId, cancellationToken);

        if (!orgExists)
        {
            throw new KeyNotFoundException("Organisation not found.");
        }

        var divisions = await _db.Divisions
            .Where(d => d.OrganisationId == request.OrganisationId)
            .AsNoTracking()
            .Select(d => new DivisionDto(d.Id, d.Name))
            .ToListAsync(cancellationToken);

        return divisions;
    }
}

