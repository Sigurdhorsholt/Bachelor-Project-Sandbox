using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using Application.Domain.Entities;

namespace Application.Propositions.Commands.DeleteProposition;

public record DeletePropositionCommand(Guid MeetingId, Guid ItemId, Guid PropositionId) : IRequest<Unit>;

public class DeletePropositionCommandHandler : IRequestHandler<DeletePropositionCommand, Unit>
{
    private readonly AppDbContext _db;

    public DeletePropositionCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Unit> Handle(DeletePropositionCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Id == request.MeetingId, cancellationToken);
        if (meeting == null)
        {
            throw new KeyNotFoundException("Meeting not found.");
        }

        if (meeting.Status == MeetingStatus.Finished)
        {
            throw new InvalidOperationException("Finished meetings cannot be edited.");
        }

        var p = await _db.Propositions
            .Where(x => x.Id == request.PropositionId && x.AgendaItemId == request.ItemId)
            .AsTracking()
            .FirstOrDefaultAsync(cancellationToken);

        if (p == null)
        {
            throw new KeyNotFoundException("Proposition not found.");
        }

        _db.Propositions.Remove(p);
        await _db.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

