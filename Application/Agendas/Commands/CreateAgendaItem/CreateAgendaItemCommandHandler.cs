
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using Application.Domain.Entities;

namespace Application.Agendas.Commands.CreateAgendaItem;

public record CreateAgendaItemCommand(Guid MeetingId, string Title, string? Description) : IRequest<CreateAgendaItemResult>;
public record CreateAgendaItemResult(Guid Id, string Title, string? Description);

public class CreateAgendaItemCommandHandler : IRequestHandler<CreateAgendaItemCommand, CreateAgendaItemResult>
{
    private readonly AppDbContext _db;
    public CreateAgendaItemCommandHandler(AppDbContext db) => _db = db;

    public async Task<CreateAgendaItemResult> Handle(CreateAgendaItemCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings.FirstOrDefaultAsync(m => m.Id == request.MeetingId, cancellationToken);
        if (meeting == null) throw new KeyNotFoundException("Meeting not found.");
        if (meeting.Status == MeetingStatus.Finished) throw new InvalidOperationException("Finished meetings cannot be edited.");
        if (string.IsNullOrWhiteSpace(request.Title)) throw new ArgumentException("Title is required.");

        var item = new AgendaItem
        {
            Id = Guid.NewGuid(),
            MeetingId = request.MeetingId,
            Title = request.Title.Trim(),
            Description = request.Description
        };

        _db.AgendaItems.Add(item);
        await _db.SaveChangesAsync(cancellationToken);

        return new CreateAgendaItemResult(item.Id, item.Title, item.Description);
    }
}
