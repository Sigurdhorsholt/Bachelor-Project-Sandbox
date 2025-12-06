using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using Application.Domain.Entities;

namespace Application.Propositions.Commands.CreateProposition;

public record CreatePropositionCommand(Guid MeetingId, Guid ItemId, string Question, string VoteType) : IRequest<CreatePropositionResult>;
public record CreatePropositionResult(Guid Id, string Question, string VoteType);

public class CreatePropositionCommandHandler : IRequestHandler<CreatePropositionCommand, CreatePropositionResult>
{
    private readonly AppDbContext _db;

    public CreatePropositionCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CreatePropositionResult> Handle(CreatePropositionCommand request, CancellationToken cancellationToken)
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

        var agendaExists = await _db.AgendaItems.AnyAsync(a => a.Id == request.ItemId && a.MeetingId == request.MeetingId, cancellationToken);
        if (!agendaExists)
        {
            throw new KeyNotFoundException("Agenda item not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Question))
        {
            throw new ArgumentException("Question is required.");
        }

        if (string.IsNullOrWhiteSpace(request.VoteType))
        {
            throw new ArgumentException("VoteType is required.");
        }

        var p = new Proposition
        {
            Id = Guid.NewGuid(),
            AgendaItemId = request.ItemId,
            Question = request.Question.Trim(),
            VoteType = request.VoteType.Trim()
        };

        _db.Propositions.Add(p);
        await _db.SaveChangesAsync(cancellationToken);

        return new CreatePropositionResult(p.Id, p.Question, p.VoteType);
    }
}

