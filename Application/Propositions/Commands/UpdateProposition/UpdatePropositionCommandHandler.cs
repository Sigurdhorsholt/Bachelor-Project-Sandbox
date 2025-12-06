using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using Application.Domain.Entities;

namespace Application.Propositions.Commands.UpdateProposition;

public record UpdatePropositionCommand(Guid MeetingId, Guid ItemId, Guid PropositionId, string? Question, string? VoteType) : IRequest<UpdatePropositionResult>;
public record UpdatePropositionResult(Guid Id, string Question, string VoteType);

public class UpdatePropositionCommandHandler : IRequestHandler<UpdatePropositionCommand, UpdatePropositionResult>
{
    private readonly AppDbContext _db;

    public UpdatePropositionCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<UpdatePropositionResult> Handle(UpdatePropositionCommand request, CancellationToken cancellationToken)
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

        if (request.Question is not null)
        {
            var q = request.Question.Trim();
            if (q.Length == 0)
            {
                throw new ArgumentException("Question cannot be empty.");
            }

            p.Question = q;
        }

        if (request.VoteType is not null)
        {
            var vt = request.VoteType.Trim();
            if (vt.Length == 0)
            {
                throw new ArgumentException("VoteType cannot be empty.");
            }

            p.VoteType = vt;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new UpdatePropositionResult(p.Id, p.Question, p.VoteType);
    }
}

