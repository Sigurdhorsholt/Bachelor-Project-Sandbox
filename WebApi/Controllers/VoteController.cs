using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApi.Realtime;
using Microsoft.AspNetCore.Authorization;
using WebApi.DTOs;

namespace WebApi.Controllers;

[ApiController]
[Route("api/vote")]
public class VoteController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMeetingBroadcaster _broadcast;
    private readonly ILogger<VoteController> _logger;

    public VoteController(
        AppDbContext db,
        IMeetingBroadcaster broadcaster,
        ILogger<VoteController> logger)
    {
        _db = db;
        _broadcast = broadcaster;
        _logger = logger;
    }

    /// <summary>
    /// Cast a vote using an admission ticket code
    /// </summary>
    [HttpPost("cast")]
    [Authorize(Policy = "AttendeeOnly")]
    public async Task<IActionResult> CastVote([FromBody] CastVoteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest("Admission ticket code is required.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync();

        try
        {
            // 1. Validate admission ticket
            var ticket = await _db.AdmissionTickets
                .Include(t => t.Meeting)
                .FirstOrDefaultAsync(t => t.Code == request.Code);

            if (ticket == null)
            {
                return NotFound("Invalid admission ticket code.");
            }

            if (ticket.MeetingId != request.MeetingId)
            {
                return BadRequest("This admission ticket does not belong to the specified meeting.");
            }

            // 2. Find the open votation for this proposition
            var votation = await _db.Votations
                .Include(v => v.Proposition)
                .FirstOrDefaultAsync(v =>
                    v.MeetingId == request.MeetingId &&
                    v.PropositionId == request.PropositionId &&
                    v.Open);

            if (votation == null)
            {
                return NotFound("No open votation found for this proposition.");
            }

            // 3. Validate vote option belongs to this proposition
            var voteOption = await _db.VoteOptions
                .FirstOrDefaultAsync(vo =>
                    vo.Id == request.VoteOptionId &&
                    vo.PropositionId == request.PropositionId);

            if (voteOption == null)
            {
                return BadRequest("Invalid vote option for this proposition.");
            }

            // 4. CRITICAL: Check if this ticket has already voted in THIS votation
            var existingBallot = await _db.Ballots
                .Include(b => b.Vote)
                    .ThenInclude(v => v.AuditableEvent)
                .FirstOrDefaultAsync(b =>
                    b.AdmissionTicketId == ticket.Id &&
                    b.VotationId == votation.Id);

            if (existingBallot != null)
            {
                // Vote already exists - UPDATE the ballot (change vote)
                _logger.LogInformation(
                    "Changing vote for ticket {TicketId} in votation {VotationId} from option {OldOption} to {NewOption}",
                    ticket.Id, votation.Id, existingBallot.VoteOptionId, request.VoteOptionId);

                existingBallot.VoteOptionId = request.VoteOptionId;
                existingBallot.CastAtUtc = DateTime.UtcNow;

                // Create new audit event for the change
                var changeEvent = new AuditableEvent
                {
                    Id = Guid.NewGuid(),
                    VoteId = existingBallot.Vote.Id,
                    EventType = "VoteChanged",
                    Metadata = $"Changed from option {existingBallot.VoteOptionId} to {request.VoteOptionId}",
                    TimestampUtc = DateTime.UtcNow
                };

                _db.AuditableEvents.Add(changeEvent);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                await _broadcast.VoteChanged(
                    request.MeetingId.ToString(),
                    request.PropositionId.ToString(),
                    votation.Id.ToString()
                );

                return Ok(new
                {
                    Message = "Vote updated successfully",
                    BallotId = existingBallot.Id,
                    VoteId = existingBallot.Vote.Id,
                    VotationId = votation.Id,
                    Action = "Updated"
                });
            }

            // 5. Create NEW ballot (first vote in this votation)
            var ballot = new Ballot
            {
                Id = Guid.NewGuid(),
                AdmissionTicketId = ticket.Id,
                VotationId = votation.Id,
                VoteOptionId = request.VoteOptionId,
                CastAtUtc = DateTime.UtcNow
            };

            _db.Ballots.Add(ballot);

            // 6. Create Vote wrapper
            var vote = new Vote
            {
                Id = Guid.NewGuid(),
                BallotId = ballot.Id,
                CreatedAtUtc = DateTime.UtcNow
            };

            _db.Votes.Add(vote);

            // 7. Create audit event
            var auditEvent = new AuditableEvent
            {
                Id = Guid.NewGuid(),
                VoteId = vote.Id,
                EventType = "VoteCast",
                Metadata = $"Vote cast on votation {votation.Id}",
                TimestampUtc = DateTime.UtcNow
            };

            _db.AuditableEvents.Add(auditEvent);

            // 8. Mark ticket as used (if not already)
            if (!ticket.Used)
            {
                ticket.Used = true;
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            _logger.LogInformation(
                "Vote cast successfully for ticket {TicketId} in votation {VotationId}",
                ticket.Id, votation.Id);

            // Broadcast vote cast event
            await _broadcast.VoteCast(
                request.MeetingId.ToString(),
                request.PropositionId.ToString(),
                votation.Id.ToString()
            );

            return Ok(new
            {
                Message = "Vote cast successfully",
                BallotId = ballot.Id,
                VoteId = vote.Id,
                VotationId = votation.Id,
                Action = "Created"
            });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Error casting vote for meeting {MeetingId}, proposition {PropositionId}",
                request.MeetingId, request.PropositionId);
            return StatusCode(500, "An error occurred while casting the vote.");
        }
    }

    /// <summary>
    /// Get vote results for a votation
    /// </summary>
    [HttpGet("results/{votationId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetVotationResults(Guid votationId)
    {
        var votation = await _db.Votations
            .Include(v => v.Proposition)
                .ThenInclude(p => p.Options)
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
            Label = opt.Label,
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

    /// <summary>
    /// Check if an admission ticket has voted in a specific votation
    /// </summary>
    [HttpGet("check/{code}/{votationId:guid}")]
    [Authorize(Policy = "AttendeeOnly")]
    public async Task<IActionResult> CheckIfVoted(string code, Guid votationId)
    {
        var ticket = await _db.AdmissionTickets
            .FirstOrDefaultAsync(t => t.Code == code);

        if (ticket == null)
        {
            return NotFound("Invalid admission ticket code.");
        }

        var ballot = await _db.Ballots
            .Include(b => b.VoteOption)
            .FirstOrDefaultAsync(b =>
                b.AdmissionTicketId == ticket.Id &&
                b.VotationId == votationId);

        if (ballot == null)
        {
            return Ok(new { HasVoted = false, VotationId = votationId });
        }

        var voteOptionLabel = ballot.VoteOption?.Label;

        return Ok(new
        {
            HasVoted = true,
            VotationId = votationId,
            BallotId = ballot.Id,
            VoteOptionId = ballot.VoteOptionId,
            VoteOptionLabel = voteOptionLabel,
            CastAt = ballot.CastAtUtc
        });
    }

    /// <summary>
    /// Get all votes for a meeting (admin endpoint)
    /// </summary>
    [HttpGet("meeting/{meetingId:guid}/all")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAllVotesForMeeting(Guid meetingId)
    {
        var meeting = await _db.Meetings.FindAsync(meetingId);
        if (meeting == null)
        {
            return NotFound("Meeting not found.");
        }

        var votes = await _db.Ballots
            .Include(b => b.Votation)
            .Include(b => b.VoteOption)
            .Include(b => b.Vote)
                .ThenInclude(v => v.AuditableEvent)
            .Where(b => b.Votation != null && b.Votation.MeetingId == meetingId)
            .Select(b => new
            {
                BallotId = b.Id,
                VotationId = b.VotationId,
                PropositionId = b.Votation!.PropositionId,
                VoteOptionId = b.VoteOptionId,
                VoteOptionLabel = b.VoteOption.Label,
                CastAt = b.CastAtUtc,
                EventType = b.Vote.AuditableEvent.EventType
            })
            .ToListAsync();

        return Ok(votes);
    }

    /// <summary>
    /// Revoke/delete a vote (admin endpoint)
    /// </summary>
    [HttpDelete("{ballotId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> RevokeVote(Guid ballotId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        try
        {
            var ballot = await _db.Ballots
                .Include(b => b.Vote)
                    .ThenInclude(v => v.AuditableEvent)
                .Include(b => b.Votation)
                .FirstOrDefaultAsync(b => b.Id == ballotId);

            if (ballot == null)
            {
                return NotFound("Ballot not found.");
            }

            if (!ballot.Votation.Open)
            {
                return BadRequest("Cannot revoke vote from a closed votation.");
            }

            // Create revocation audit event before deleting
            var revocationEvent = new AuditableEvent
            {
                Id = Guid.NewGuid(),
                VoteId = ballot.Vote.Id,
                EventType = "VoteRevoked",
                Metadata = $"Vote revoked by admin at {DateTime.UtcNow}",
                TimestampUtc = DateTime.UtcNow
            };

            _db.AuditableEvents.Add(revocationEvent);
            await _db.SaveChangesAsync();

            // Delete cascade will handle Vote and AuditableEvents
            _db.Ballots.Remove(ballot);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            _logger.LogInformation("Vote revoked for ballot {BallotId}", ballotId);

            return Ok(new { Message = "Vote revoked successfully" });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Error revoking vote for ballot {BallotId}", ballotId);
            return StatusCode(500, "An error occurred while revoking the vote.");
        }
    }
}
