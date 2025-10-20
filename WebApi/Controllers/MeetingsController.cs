// WebApi/Controllers/MeetingsController.cs
using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings")]
public class MeetingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<MeetingsController> _logger;

    public MeetingsController(AppDbContext db, ILogger<MeetingsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET: /api/meetings/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var m = await _db.Meetings
            .Include(x => x.AgendaItems).ThenInclude(a => a.Propositions)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);
        if (m is null) return NotFound();

        return Ok(new
        {
            m.Id,
            m.DivisionId,
            m.Title,
            StartsAtUtc = m.StartsAtUtc,
            Status = m.Status.ToString(),
            Agenda = m.AgendaItems.Select(a => new
            {
                a.Id,
                a.Title,
                a.Description,
                Propositions = a.Propositions.Select(p => new { p.Id, Question = p.Question, VoteType = p.VoteType }).ToList()
            }).ToList()
        });
    }

    public class UpdateMeetingRequest
    {
        public string? Title { get; set; }
        public DateTime? StartsAtUtc { get; set; }
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public MeetingStatus? Status { get; set; }
    }

    // PATCH: /api/meetings/{id}
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] UpdateMeetingRequest req)
    {
        var meeting = await _db.Meetings
            .Include(x => x.AgendaItems).ThenInclude(a => a.Propositions)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (meeting == null) return NotFound();

        if (meeting.Status == MeetingStatus.Finished)
            return Conflict("Finished meetings cannot be edited.");

        if (req.Title is not null)
        {
            var t = req.Title.Trim();
            if (t.Length == 0) return BadRequest("Title cannot be empty.");
            meeting.Title = t;
        }

        if (req.StartsAtUtc is not null)
        {
            var dt = DateTime.SpecifyKind(req.StartsAtUtc.Value, DateTimeKind.Utc);
            meeting.StartsAtUtc = dt;
        }

        if (req.Status is not null)
            meeting.Status = req.Status.Value;

        await _db.SaveChangesAsync();
        // reload no tracking for clean output
        var updated = await _db.Meetings
            .Include(x => x.AgendaItems).ThenInclude(a => a.Propositions)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);

        return Ok(new
        {
            updated!.Id,
            updated.DivisionId,
            updated.Title,
            StartsAtUtc = updated.StartsAtUtc,
            Status = updated.Status.ToString(),
            Agenda = updated.AgendaItems.Select(a => new
            {
                a.Id,
                a.Title,
                a.Description,
                Propositions = a.Propositions.Select(p => new { p.Id, Question = p.Question, VoteType = p.VoteType }).ToList()
            }).ToList()
        });
    }
}
