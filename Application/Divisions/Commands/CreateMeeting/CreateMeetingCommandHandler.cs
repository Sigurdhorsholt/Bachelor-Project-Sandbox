using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Persistence;
using Application.Services;
using Application.Domain.Entities;

namespace Application.Divisions.Commands.CreateMeeting;

public record CreateMeetingCommand(Guid DivisionId, string Title, DateTime StartsAtUtc, MeetingStatus Status) : IRequest<CreateMeetingResult>;
public record CreateMeetingResult(Guid Id, string Title, DateTime StartsAtUtc, string Status, string MeetingCode);

public class CreateMeetingCommandHandler : IRequestHandler<CreateMeetingCommand, CreateMeetingResult>
{
    private readonly AppDbContext _db;
    private readonly IMeetingCodeService _meetingCodeService;

    public CreateMeetingCommandHandler(AppDbContext db, IMeetingCodeService meetingCodeService)
    {
        _db = db;
        _meetingCodeService = meetingCodeService;
    }

    public async Task<CreateMeetingResult> Handle(CreateMeetingCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ArgumentException("Title is required.");
        }

        var division = await _db.Divisions.FindAsync(new object[] { request.DivisionId }, cancellationToken);
        if (division == null)
        {
            throw new KeyNotFoundException("Division not found.");
        }

        const int maxAttempts = 5;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            string code;
            try
            {
                code = await _meetingCodeService.GenerateUniqueCodeAsync();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to generate meeting code: " + ex.Message, ex);
            }

            var meeting = new Meeting
            {
                Id = Guid.NewGuid(),
                DivisionId = request.DivisionId,
                Title = request.Title.Trim(),
                StartsAtUtc = request.StartsAtUtc,
                Status = request.Status,
                MeetingCode = code
            };

            _db.Meetings.Add(meeting);

            try
            {
                await _db.SaveChangesAsync(cancellationToken);

                return new CreateMeetingResult(meeting.Id, meeting.Title, meeting.StartsAtUtc, meeting.Status.ToString(), meeting.MeetingCode);
            }
            catch (DbUpdateException)
            {
                _db.Entry(meeting).State = EntityState.Detached;

                if (attempt == maxAttempts - 1)
                {
                    throw new InvalidOperationException("Failed to save meeting due to meeting code collision. Try again.");
                }
            }
        }

        throw new InvalidOperationException("Failed to create meeting.");
    }
}

