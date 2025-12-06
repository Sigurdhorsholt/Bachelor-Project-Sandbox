using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;

namespace Application.Organisations.Queries.GetById;

public record GetOrganisationQuery(Guid Id) : IRequest<OrganisationDetailsDto>;
public record DivisionDto(Guid Id, string Name);
public record OrganisationDetailsDto(Guid Id, string Name, List<DivisionDto> Divisions);

public class GetOrganisationQueryHandler : IRequestHandler<GetOrganisationQuery, OrganisationDetailsDto>
{
    private readonly AppDbContext _db;

    public GetOrganisationQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<OrganisationDetailsDto> Handle(GetOrganisationQuery request, CancellationToken cancellationToken)
    {
        var org = await _db.Organisations
            .Include(o => o.Divisions)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (org == null)
        {
            throw new KeyNotFoundException("Organisation not found.");
        }

        var divisions = org.Divisions.Select(d => new DivisionDto(d.Id, d.Name)).ToList();

        return new OrganisationDetailsDto(org.Id, org.Name, divisions);
    }
}

