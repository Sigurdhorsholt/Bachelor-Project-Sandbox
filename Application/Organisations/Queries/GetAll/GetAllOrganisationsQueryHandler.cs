using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;

namespace Application.Organisations.Queries.GetAll;

public record GetAllOrganisationsQuery() : IRequest<List<OrganisationDto>>;
public record OrganisationDto(Guid Id, string Name);

public class GetAllOrganisationsQueryHandler : IRequestHandler<GetAllOrganisationsQuery, List<OrganisationDto>>
{
    private readonly AppDbContext _db;

    public GetAllOrganisationsQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<OrganisationDto>> Handle(GetAllOrganisationsQuery request, CancellationToken cancellationToken)
    {
        var orgs = await _db.Organisations
            .AsNoTracking()
            .Select(o => new OrganisationDto(o.Id, o.Name))
            .ToListAsync(cancellationToken);

        return orgs;
    }
}

