// WebApi/Controllers/MeetingsController.cs
using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using System.Linq;
using Microsoft.Extensions.Logging;
using WebApi.Realtime;
using WebApi.Services;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings")]
public class MeetingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<MeetingsController> _logger;
    private readonly IMeetingCodeService _codeService;
    private readonly IMeetingBroadcaster _broadcast;


    public MeetingsController(
        AppDbContext db,
        ILogger<MeetingsController> logger,
        IMeetingCodeService codeService,
        IMeetingBroadcaster broadcast)
    {
        _db = db;
        _logger = logger;
        _codeService = codeService;
        _broadcast = broadcast;
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
            MeetingCode = m.MeetingCode,
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

        // ask backend to regenerate meeting code and persist it
        public bool? RegenerateMeetingCode { get; set; }
    }

    // PATCH: /api/meetings/{id}
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] UpdateMeetingRequest req)
    {
        var meeting = await _db.Meetings
            .Include(x => x.AgendaItems).ThenInclude(a => a.Propositions)
            .AsTracking()
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

        if (req.RegenerateMeetingCode == true)
        {
            try
            {
                var code = await _codeService.GenerateUniqueCodeAsync();
                meeting.MeetingCode = code;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to regenerate meeting code for {MeetingId}", id);
                return StatusCode(500, "Failed to generate meeting code: " + ex.Message);
            }
        }

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
            MeetingCode = updated.MeetingCode,
            Agenda = updated.AgendaItems.Select(a => new
            {
                a.Id,
                a.Title,
                a.Description,
                Propositions = a.Propositions.Select(p => new { p.Id, Question = p.Question, VoteType = p.VoteType }).ToList()
            }).ToList()
        });
    }
    
    
    [HttpPost("{id}/start")]
    public async Task<IActionResult> StartMeeting(string id, CancellationToken cancellationToken)
    {
        var meeting = await _db.Meetings.FirstOrDefaultAsync(x => x.Id == Guid.Parse(id), cancellationToken);
        
        if (meeting is null)
        {
            return NotFound();
        }

        if ((MeetingStarted)meeting.Started == MeetingStarted.NotStarted)
        {
            return NoContent();
        }

        meeting.Started = (int)MeetingStarted.Started;
        //TODO: Add meeting started At time
        await _db.SaveChangesAsync(cancellationToken);

        await _broadcast.MeetingStarted(meeting.Id.ToString());
        await _broadcast.MeetingStateChanged(meeting.Id.ToString(), meeting.Started);

        return NoContent();
    }
    
}
