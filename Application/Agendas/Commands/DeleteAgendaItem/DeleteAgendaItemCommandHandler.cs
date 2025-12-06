
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;

namespace Application.Agendas.Commands.DeleteAgendaItem;

public record DeleteAgendaItemCommand(Guid MeetingId, Guid ItemId) : IRequest<Unit>;

public class DeleteAgendaItemCommandHandler : IRequestHandler<DeleteAgendaItemCommand, Unit>
{
    private readonly AppDbContext _db;
    public DeleteAgendaItemCommandHandler(AppDbContext db) => _db = db;

    public async Task<Unit> Handle(DeleteAgendaItemCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Id == request.MeetingId, cancellationToken);
        if (meeting == null) throw new KeyNotFoundException("Meeting not found.");
        if (meeting.Status == Domain.Entities.MeetingStatus.Finished) throw new InvalidOperationException("Finished meetings cannot be edited.");

        var item = await _db.AgendaItems
            .Where(a => a.Id == request.ItemId && a.MeetingId == request.MeetingId)
            .AsTracking()
            .FirstOrDefaultAsync(cancellationToken);
        if (item == null) throw new KeyNotFoundException("Agenda item not found.");

        _db.AgendaItems.Remove(item);
        await _db.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
