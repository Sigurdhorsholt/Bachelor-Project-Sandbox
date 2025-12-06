using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using Application.Domain.Entities;

namespace Application.Organisations.Commands.CreateDivision;

public record CreateDivisionCommand(Guid OrganisationId, string Name) : IRequest<CreateDivisionResult>;
public record CreateDivisionResult(Guid Id, string Name);

public class CreateDivisionCommandHandler : IRequestHandler<CreateDivisionCommand, CreateDivisionResult>
{
    private readonly AppDbContext _db;

    public CreateDivisionCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CreateDivisionResult> Handle(CreateDivisionCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Division name is required.");
        }

        var org = await _db.Organisations.FindAsync(new object[] { request.OrganisationId }, cancellationToken);
        if (org == null)
        {
            throw new KeyNotFoundException("Organisation not found.");
        }

        var division = new Division
        {
            Id = Guid.NewGuid(),
            OrganisationId = org.Id,
            Name = request.Name.Trim()
        };

        _db.Divisions.Add(division);
        await _db.SaveChangesAsync(cancellationToken);

        return new CreateDivisionResult(division.Id, division.Name);
    }
}

