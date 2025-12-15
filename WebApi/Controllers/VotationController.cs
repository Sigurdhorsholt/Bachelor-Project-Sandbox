using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApi.Realtime;
using Microsoft.AspNetCore.Authorization;

namespace WebApi.Controllers;


[ApiController]
[Route("api/votation/")]
[Authorize]
public class VotationController : ControllerBase
{
    private AppDbContext _db;
    private readonly IMeetingBroadcaster _broadcast;

    public VotationController(
        AppDbContext db,
        IMeetingBroadcaster broadcaster
        )
    {
        _db = db;
        _broadcast = broadcaster;
    } 
    
    
    
    [HttpPost("start/{meetingId:guid}/{propositionId:guid}")]
    public async Task<IActionResult> StartVoteAndCreateVotation(Guid meetingId, Guid propositionId)
    {
  
        var meeting = await _db.Meetings.FindAsync(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");
        
        var proposition = await _db.Propositions.FindAsync(propositionId);
        if (proposition == null) return NotFound("Proposition not found.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        
        var openVotationExists = await _db.Votations
            .AnyAsync(v => v.MeetingId == meetingId && v.PropositionId == propositionId && v.Open);
        
        var anyVotationExists = await _db.Votations
            .AnyAsync(v => v.MeetingId == meetingId && v.PropositionId == propositionId);

        if (openVotationExists)
        {
            return BadRequest("An open votation for this proposition already exists in the meeting.");
        }

        if (anyVotationExists)
        {
            var votations = await _db.Votations
                .Where(v => v.MeetingId == meetingId && v.PropositionId == propositionId)
                .ToListAsync();

            votations.ForEach(v => v.Overwritten = true);
            
            await _db.SaveChangesAsync();
        }
        
        
        var votation = new Votation
        {
            Id = Guid.NewGuid(),
            MeetingId = meetingId,
            PropositionId = propositionId,
            StartedAtUtc = DateTime.UtcNow,
            Open = true,
            Overwritten = false
        };
        
        _db.Votations.Add(votation);
        await _db.SaveChangesAsync();
        
        await tx.CommitAsync();
        
        await _broadcast.MeetingPropositionOpened(
            meetingId.ToString(),
            propositionId.ToString(),
            votation.Id.ToString()
        );
        
        return Ok(votation);
    }

    [HttpPost("stop/{propositionId:guid}")]
    public async Task<IActionResult> StopVotation(Guid propositionId)
    {
        var votation = await _db.Votations
            .AsTracking()  // ← This is critical for EF Core to track changes!
            .Where(v => v.PropositionId == propositionId && v.Open)
            .OrderByDescending(v => v.StartedAtUtc)
            .FirstOrDefaultAsync();
        
        if (votation == null)
        {
            return NotFound("No open votation found for this proposition.");
        }

        votation.Open = false;
        votation.EndedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _broadcast.MeetingVotationStopped(
            votation.MeetingId.ToString(),
            votation.PropositionId.ToString(),
            votation.Id.ToString(),
            votation.EndedAtUtc ?? DateTime.UtcNow
        );

        return Ok(votation);
    }
    
    
    [HttpGet("{votationId:guid}")]
    public async Task<IActionResult> GetVotation(Guid votationId)
    {
        var votation = await _db.Votations.FindAsync(votationId);
        if (votation == null) return NotFound();
        return Ok(votation);
    }

    [HttpGet("open-votes/{meetingId:guid}")]
    public async Task<IActionResult> GetOpenVotationsForMeeting(Guid meetingId)
    {
        var meeting = await _db.Meetings.FindAsync(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");
        
        
        var openVotations = await _db.Votations
            .Where(v => v.MeetingId == meetingId && v.Open)
            .ToListAsync();

        return Ok(openVotations);
    }

    // GET: /api/votation/by-proposition/{meetingId}/{propositionId}
    [HttpGet("by-proposition/{meetingId:guid}/{propositionId:guid}")]
    public async Task<IActionResult> GetVotationsByProposition(Guid meetingId, Guid propositionId)
    {
        var meeting = await _db.Meetings.FindAsync(meetingId);
        if (meeting == null) return NotFound("Meeting not found.");

        var proposition = await _db.Propositions.FindAsync(propositionId);
        if (proposition == null) return NotFound("Proposition not found.");

        var votations = await _db.Votations
            .Where(v => v.MeetingId == meetingId && v.PropositionId == propositionId)
            .OrderByDescending(v => v.StartedAtUtc)
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
            .ToListAsync();

        return Ok(votations);
    }
    
    // GET: /api/votation/results/{votationId}
    [HttpGet("results/{votationId:guid}")]
    [AllowAnonymous] // TEMP: allow anonymous for debugging; remove/restore AdminOnly policy after testing
    public async Task<IActionResult> GetVotationResults(Guid votationId)
    {
        var votation = await _db.Votations
            .Include(v => v.Proposition!)
                .ThenInclude(p => p.Options!)
            .FirstOrDefaultAsync(v => v.Id == votationId);

        if (votation == null)
        {
            return NotFound("Votation not found.");
        }

        var proposition = votation.Proposition;
        if (proposition == null)
        {
            return NotFound("Proposition not found for this votation.");
        }

        // Get all ballots for this votation with vote options
        var ballots = await _db.Ballots
            .Include(b => b.VoteOption)
            .Where(b => b.VotationId == votationId)
            .ToListAsync();

        var results = proposition.Options.Select(opt => new
        {
            VoteOptionId = opt.Id,
            opt.Label,
            Count = ballots.Count(b => b.VoteOptionId == opt.Id)
        }).ToList();

        return Ok(new
        {
            VotationId = votation.Id,
            PropositionId = votation.PropositionId,
            Question = proposition.Question,
            TotalVotes = ballots.Count,
            Results = results,
            Open = votation.Open,
            StartedAt = votation.StartedAtUtc,
            EndedAt = votation.EndedAtUtc
        });
    }

    // POST: /api/votation/revote/{propositionId}
    [HttpPost("revote/{propositionId:guid}")]
    public async Task<IActionResult> StartReVote(Guid propositionId)
    {
        // Find the latest votation for the given proposition (by StartedAtUtc descending)
        var latest = await _db.Votations
            .AsTracking() // ensure EF Core will track and persist our change
            .Where(v => v.PropositionId == propositionId)
            .OrderByDescending(v => v.StartedAtUtc)
            .FirstOrDefaultAsync();
        
        var existingVotations = await _db.Votations
            .Where(v => v.PropositionId == propositionId && v.Open && !v.Overwritten)
            .ToListAsync();
        
        foreach (var v in existingVotations)
        {
            v.Overwritten = true;
            v.Open = false;
            v.EndedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        // If we closed an open votation, broadcast that it stopped so realtime clients update
        if (latest != null && !latest.Open)
        {
            await _broadcast.MeetingVotationStopped(
                latest.MeetingId.ToString(),
                latest.PropositionId.ToString(),
                latest.Id.ToString(),
                latest.EndedAtUtc ?? DateTime.UtcNow
            );
        }

        return Ok();
    }

}