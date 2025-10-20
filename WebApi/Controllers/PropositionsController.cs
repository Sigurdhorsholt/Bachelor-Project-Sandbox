// WebApi/Controllers/PropositionsController.cs
using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings/{meetingId:guid}/agenda/{itemId:guid}/propositions")]
public class PropositionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public PropositionsController(AppDbContext db) => _db = db;

    private Task<Meeting?> GetMeeting(Guid meetingId) =>
        _db.Meetings.FirstOrDefaultAsync(m => m.Id == meetingId);

    private Task<bool> AgendaItemExists(Guid meetingId, Guid itemId) =>
        _db.AgendaItems.AnyAsync(a => a.Id == itemId && a.MeetingId == meetingId);

    // GET
    [HttpGet]
    public async Task<IActionResult> Get(Guid meetingId, Guid itemId)
    {
        if (!await AgendaItemExists(meetingId, itemId)) return NotFound("Agenda item not found.");

        var list = await _db.Propositions
            .Where(p => p.AgendaItemId == itemId)
            .AsNoTracking()
            .Select(p => new { p.Id, p.Question, p.VoteType })
            .ToListAsync();

        return Ok(list);
    }

    public record CreatePropositionRequest(string Question, string VoteType);

    // POST
    [HttpPost]
    public async Task<IActionResult> Create(Guid meetingId, Guid itemId, [FromBody] CreatePropositionRequest req)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");
        if (meeting.Status == MeetingStatus.Finished) return Conflict("Finished meetings cannot be edited.");

        var exists = await _db.AgendaItems.AnyAsync(a => a.Id == itemId && a.MeetingId == meetingId);
        if (!exists) return NotFound("Agenda item not found.");

        if (string.IsNullOrWhiteSpace(req.Question)) return BadRequest("Question is required.");
        if (string.IsNullOrWhiteSpace(req.VoteType)) return BadRequest("VoteType is required.");

        var p = new Proposition {
            Id = Guid.NewGuid(),
            AgendaItemId = itemId,
            Question = req.Question.Trim(),
            VoteType = req.VoteType.Trim()
        };
        _db.Propositions.Add(p);
        await _db.SaveChangesAsync();

        return Ok(new { p.Id, p.Question, p.VoteType });
    }

    public record UpdatePropositionRequest(string? Question, string? VoteType);

    // PATCH
    [HttpPatch("{propId:guid}")]
    public async Task<IActionResult> Update(Guid meetingId, Guid itemId, Guid propId, [FromBody] UpdatePropositionRequest req)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");
        if (meeting.Status == MeetingStatus.Finished) return Conflict("Finished meetings cannot be edited.");

        var p = await _db.Propositions.FirstOrDefaultAsync(x => x.Id == propId && x.AgendaItemId == itemId);
        if (p == null) return NotFound();

        if (req.Question is not null)
        {
            var q = req.Question.Trim();
            if (q.Length == 0) return BadRequest("Question cannot be empty.");
            p.Question = q;
        }
        if (req.VoteType is not null)
        {
            var vt = req.VoteType.Trim();
            if (vt.Length == 0) return BadRequest("VoteType cannot be empty.");
            p.VoteType = vt;
        }

        await _db.SaveChangesAsync();
        return Ok(new { p.Id, p.Question, p.VoteType });
    }

    // DELETE
    [HttpDelete("{propId:guid}")]
    public async Task<IActionResult> Delete(Guid meetingId, Guid itemId, Guid propId)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");
        if (meeting.Status == MeetingStatus.Finished) return Conflict("Finished meetings cannot be edited.");

        var p = await _db.Propositions.FirstOrDefaultAsync(x => x.Id == propId && x.AgendaItemId == itemId);
        if (p == null) return NotFound();

        _db.Propositions.Remove(p);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
