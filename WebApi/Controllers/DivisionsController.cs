// WebApi/Controllers/DivisionsController.cs

using System.Text.Json.Serialization;
using Application.Domain.Entities;
using Application.Persistence;
using Application.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/divisions")]
public class DivisionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMeetingCodeService _meetingCodeService;

    public DivisionsController(AppDbContext db, IMeetingCodeService meetingCodeService)
    {
        _db = db;
        _meetingCodeService = meetingCodeService;
    }

    // GET: /api/divisions/{divisionId}/meetings
    [HttpGet("{divisionId:guid}/meetings")]
    public async Task<IActionResult> GetMeetings(Guid divisionId)
    {
        var exists = await _db.Divisions.AnyAsync(d => d.Id == divisionId);
        if (!exists)
            return NotFound("Division not found.");

        var items = await _db.Meetings
            .Where(m => m.DivisionId == divisionId)
            .OrderBy(m => m.StartsAtUtc)
            .AsNoTracking()
            .Select(m => new
            {
                m.Id,
                m.Title,
                StartsAtUtc = m.StartsAtUtc,
                Status = m.Status.ToString()
            })
            .ToListAsync();

        return Ok(items);
    }

    public record CreateMeetingRequest(
        string Title,
        DateTime StartsAtUtc,
        [property: JsonConverter(typeof(JsonStringEnumConverter))] MeetingStatus Status
    );
    // POST: /api/divisions/{divisionId}/meetings
    [HttpPost("{divisionId:guid}/meetings")]
    public async Task<IActionResult> CreateMeeting(Guid divisionId, [FromBody] CreateMeetingRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest("Title is required.");

        var division = await _db.Divisions.FindAsync(divisionId);
        if (division == null)
            return NotFound("Division not found.");

        // Try to create meeting, regenerating code if we hit unique constraint collisions
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
                return StatusCode(500, "Failed to generate meeting code: " + ex.Message);
            }

            var meeting = new Meeting
            {
                Id = Guid.NewGuid(),
                DivisionId = divisionId,
                Title = req.Title.Trim(),
                StartsAtUtc = req.StartsAtUtc,
                Status = req.Status,
                MeetingCode = code
            };

            _db.Meetings.Add(meeting);
            try
            {
                await _db.SaveChangesAsync();

                return Ok(new
                {
                    meeting.Id,
                    meeting.Title,
                    StartsAtUtc = meeting.StartsAtUtc,
                    Status = meeting.Status.ToString(),
                    MeetingCode = meeting.MeetingCode
                });
            }
            catch (DbUpdateException)
            {
                // Likely a unique constraint collision on MeetingCode, retry
                _db.Entry(meeting).State = EntityState.Detached;
                if (attempt == maxAttempts - 1)
                    return StatusCode(500, "Failed to save meeting due to meeting code collision. Try again.");
            }
        }

        return StatusCode(500, "Failed to create meeting.");
    }
}
