using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using Application.Domain.Entities;

namespace Application.Organisations.Commands.CreateOrganisation;

public record CreateOrganisationCommand(string Name) : IRequest<CreateOrganisationResult>;
public record CreateOrganisationResult(Guid Id, string Name);

public class CreateOrganisationCommandHandler : IRequestHandler<CreateOrganisationCommand, CreateOrganisationResult>
{
    private readonly AppDbContext _db;

    public CreateOrganisationCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CreateOrganisationResult> Handle(CreateOrganisationCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Name is required.");
        }

        var entity = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim()
        };

        _db.Organisations.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return new CreateOrganisationResult(entity.Id, entity.Name);
    }
}

