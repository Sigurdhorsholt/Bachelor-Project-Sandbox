// WebApi/Controllers/VoteOptionsController.cs
using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WebApi.DTOs;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings/{meetingId:guid}/agenda/{itemId:guid}/propositions/{propId:guid}/vote-options")]
public class VoteOptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public VoteOptionsController(AppDbContext db) => _db = db;

    private async Task<Meeting?> GetMeeting(Guid meetingId)
    {
        return await _db.Meetings.FirstOrDefaultAsync(m => m.Id == meetingId);
    }

    private Task<bool> PropositionExists(Guid propId)
    {
        return _db.Propositions.AnyAsync(p => p.Id == propId);
    }

    // GET
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> Get(Guid propId)
    {
        var opts = await _db.VoteOptions
            .Where(v => v.PropositionId == propId)
            .AsNoTracking()
            .Select(v => new { v.Id, v.Label })
            .ToListAsync();

        return Ok(opts);
    }

    // POST
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create(Guid meetingId, Guid propId, [FromBody] CreateVoteOptionRequest req)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null)
        {
            return NotFound("Meeting not found.");
        }

        if (meeting.Status == MeetingStatus.Finished)
        {
            return Conflict("Finished meetings cannot be edited.");
        }

        if (!await PropositionExists(propId))
        {
            return NotFound("Proposition not found.");
        }

        if (string.IsNullOrWhiteSpace(req.Label))
        {
            return BadRequest("Label is required.");
        }

        var v = new VoteOption
        {
            Id = Guid.NewGuid(),
            PropositionId = propId,
            Label = req.Label.Trim()
        };

        _db.VoteOptions.Add(v);
        await _db.SaveChangesAsync();

        return Ok(new { v.Id, v.Label });
    }

    // PATCH
    [HttpPatch("{voteOptionId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(Guid meetingId, Guid propId, Guid voteOptionId, [FromBody] UpdateVoteOptionRequest req)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null)
        {
            return NotFound("Meeting not found.");
        }

        if (meeting.Status == MeetingStatus.Finished)
        {
            return Conflict("Finished meetings cannot be edited.");
        }

        var v = await _db.VoteOptions.FirstOrDefaultAsync(x => x.Id == voteOptionId && x.PropositionId == propId);
        if (v == null)
        {
            return NotFound();
        }

        if (req.Label is not null)
        {
            var l = req.Label.Trim();
            if (l.Length == 0)
            {
                return BadRequest("Label cannot be empty.");
            }

            v.Label = l;
        }

        await _db.SaveChangesAsync();
        return Ok(new { v.Id, v.Label });
    }

    // DELETE
    [HttpDelete("{voteOptionId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid meetingId, Guid propId, Guid voteOptionId)
    {
        var meeting = await GetMeeting(meetingId);
        if (meeting == null)
        {
            return NotFound("Meeting not found.");
        }

        if (meeting.Status == MeetingStatus.Finished)
        {
            return Conflict("Finished meetings cannot be edited.");
        }

        var v = await _db.VoteOptions.FirstOrDefaultAsync(x => x.Id == voteOptionId && x.PropositionId == propId);
        if (v == null)
        {
            return NotFound();
        }

        _db.VoteOptions.Remove(v);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
