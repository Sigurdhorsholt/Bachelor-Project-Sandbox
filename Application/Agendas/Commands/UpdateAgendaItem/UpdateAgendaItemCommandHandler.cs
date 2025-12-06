
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using Application.Domain.Entities;

namespace Application.Agendas.Commands.UpdateAgendaItem;

public record UpdateAgendaItemCommand(Guid MeetingId, Guid ItemId, string? Title, string? Description) : IRequest<UpdateAgendaItemResult>;
public record UpdateAgendaItemResult(Guid Id, string Title, string? Description);

public class UpdateAgendaItemCommandHandler : IRequestHandler<UpdateAgendaItemCommand, UpdateAgendaItemResult>
{
    private readonly AppDbContext _db;
    public UpdateAgendaItemCommandHandler(AppDbContext db) => _db = db;

    public async Task<UpdateAgendaItemResult> Handle(UpdateAgendaItemCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Id == request.MeetingId, cancellationToken);
        if (meeting == null) throw new KeyNotFoundException("Meeting not found.");
        if (meeting.Status == MeetingStatus.Finished) throw new InvalidOperationException("Finished meetings cannot be edited.");

        var item = await _db.AgendaItems
            .Where(a => a.Id == request.ItemId && a.MeetingId == request.MeetingId)
            .AsTracking()
            .FirstOrDefaultAsync(cancellationToken);
        if (item == null) throw new KeyNotFoundException("Agenda item not found.");

        if (request.Title is not null)
        {
            var t = request.Title.Trim();
            if (t.Length == 0) throw new ArgumentException("Title cannot be empty.");
            item.Title = t;
        }
        if (request.Description is not null)
            item.Description = request.Description;

        await _db.SaveChangesAsync(cancellationToken);

        return new UpdateAgendaItemResult(item.Id, item.Title, item.Description);
    }
}
