// WebApi/Controllers/AgendaController.cs
using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings/{meetingId:guid}/agenda")]
public class AgendaController : ControllerBase
{
    private readonly AppDbContext _db;
    public AgendaController(AppDbContext db) => _db = db;

    private async Task<Meeting?> GetMeeting(Guid meetingId) =>
        await _db.Meetings.FirstOrDefaultAsync(m => m.Id == meetingId);

    // GET: /api/meetings/{meetingId}/agenda
    // Query param: includePropositions=true to include nested propositions
    [HttpGet]
    public async Task<IActionResult> GetAgenda(Guid meetingId, [FromQuery] bool includePropositions = false)
    {
        var exists = await _db.Meetings.AnyAsync(m => m.Id == meetingId);
        if (!exists) return NotFound("Meeting not found.");

        if (!includePropositions)
        {
            var items = await _db.AgendaItems
                .Where(a => a.MeetingId == meetingId)
                .AsNoTracking()
                .Select(a => new { a.Id, a.Title, a.Description })
                .ToListAsync();

            return Ok(items);
        }

        // Include propositions with vote options and votations
        var itemsWithPropositions = await _db.AgendaItems
            .Where(a => a.MeetingId == meetingId)
            .Include(a => a.Propositions)
                .ThenInclude(p => p.Options)
            .Include(a => a.Propositions)
                .ThenInclude(p => p.Votations.Where(v => v.MeetingId == meetingId))
            .AsNoTracking()
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Description,
                Propositions = a.Propositions.Select(p => new
                {
                    p.Id,
                    Question = p.Question,
                    VoteType = p.VoteType,
                    VoteOptions = p.Options.Select(o => new { o.Id, o.Label }).ToList(),
                    Votations = p.Votations
                        .Where(v => v.MeetingId == meetingId && v.PropositionId == p.Id)
                        .Select(v => new
                        {
                            v.Id,
                            v.MeetingId,
                            v.PropositionId,
                            v.StartedAtUtc,
                            v.EndedAtUtc,
                            v.Open,
                            v.Overwritten
                        })
                        .ToList(),
                    IsOpen = p.Votations.Any(v => v.Open)
                }).ToList()
            })
            .ToListAsync();

        return Ok(itemsWithPropositions);
    }

    public record CreateAgendaItemRequest(string Title, string? Description);

    // POST: /api/meetings/{meetingId}/agenda
    [HttpPost]
    public async Task<IActionResult> Create(Guid meetingId, [FromBody] CreateAgendaItemRequest req)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");
        if (meeting.Status == MeetingStatus.Finished) return Conflict("Finished meetings cannot be edited.");
        if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest("Title is required.");

        var item = new AgendaItem {
            Id = Guid.NewGuid(),
            MeetingId = meetingId,
            Title = req.Title.Trim(),
            Description = req.Description
        };
        _db.AgendaItems.Add(item);
        await _db.SaveChangesAsync();

        return Ok(new { item.Id, item.Title, item.Description });
    }

    public record UpdateAgendaItemRequest(string? Title, string? Description);

    // PATCH: /api/meetings/{meetingId}/agenda/{itemId}
    [HttpPatch("{itemId:guid}")]
    public async Task<IActionResult> Update(Guid meetingId, Guid itemId, [FromBody] UpdateAgendaItemRequest req)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");
        if (meeting.Status == MeetingStatus.Finished) return Conflict("Finished meetings cannot be edited.");

        var item = await _db.AgendaItems
            .Where(a => a.Id == itemId && a.MeetingId == meetingId)
            .AsTracking()
            .FirstOrDefaultAsync();
        if (item == null) return NotFound();

        if (req.Title is not null)
        {
            var t = req.Title.Trim();
            if (t.Length == 0) return BadRequest("Title cannot be empty.");
            item.Title = t;
        }
        if (req.Description is not null)
            item.Description = req.Description;

        await _db.SaveChangesAsync();
        return Ok(new { item.Id, item.Title, item.Description });
    }

    // DELETE: /api/meetings/{meetingId}/agenda/{itemId}
    [HttpDelete("{itemId:guid}")]
    public async Task<IActionResult> Delete(Guid meetingId, Guid itemId)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");
        if (meeting.Status == MeetingStatus.Finished) return Conflict("Finished meetings cannot be edited.");

        var item = await _db.AgendaItems
            .Where(a => a.Id == itemId && a.MeetingId == meetingId)
            .AsTracking()
            .FirstOrDefaultAsync();
        if (item == null) return NotFound();

        _db.AgendaItems.Remove(item); // cascade handles children if configured
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
