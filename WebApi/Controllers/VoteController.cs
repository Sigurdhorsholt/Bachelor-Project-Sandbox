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
    private AppDbContext _db;
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

        // --- READ-ONLY VALIDATION PHASE (no transaction yet) ---
        // Decide TESTCODE semantics: Option A chosen.
        // Each request that supplies exactly "TESTCODE" will get a unique ticket
        // with code "TESTCODE-{Guid}" scoped to the provided MeetingId. This
        // ensures that each request generates a fresh ticket and therefore a
        // new ballot will be created for test traffic.
        var isTestRequest = request.Code == "TESTCODE";
        var generatedTestTicketCode = (string?)null;

        // Resolve the AdmissionTicket to use in write paths. For TESTCODE we create
        // an in-memory ticket (persisted only when we start the write transaction).
        // For real codes we look up the ticket now and return early if invalid.
        AdmissionTicket ticketEntity;

        if (isTestRequest)
        {
            generatedTestTicketCode = $"TESTCODE-{Guid.NewGuid():N}";
            ticketEntity = new AdmissionTicket
            {
                Id = Guid.NewGuid(),
                MeetingId = request.MeetingId,
                Code = generatedTestTicketCode,
                Used = false
            };

            _logger.LogInformation("[TestTicket] Generated ephemeral ticket {TicketCode} (Id: {TicketId}) for meeting {MeetingId}",
                generatedTestTicketCode, ticketEntity.Id, request.MeetingId);
        }
        else
        {
            var dbTicket = await _db.AdmissionTickets
                .Include(t => t.Meeting)
                .FirstOrDefaultAsync(t => t.Code == request.Code);

            if (dbTicket == null)
            {
                return NotFound("Invalid admission ticket code.");
            }

            if (dbTicket.MeetingId != request.MeetingId)
            {
                return BadRequest("This admission ticket does not belong to the specified meeting.");
            }

            ticketEntity = dbTicket;
        }

        // Find open votation for this proposition (read-only)
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

        // Validate vote option belongs to this proposition (read-only)
        var voteOption = await _db.VoteOptions
            .FirstOrDefaultAsync(vo =>
                vo.Id == request.VoteOptionId &&
                vo.PropositionId == request.PropositionId);

        if (voteOption == null)
        {
            return BadRequest("Invalid vote option for this proposition.");
        }

        // Check whether this ticket has already voted in THIS votation (read-only).
        // For TESTCODE requests we created a new in-memory ticket and therefore
        // existingBallot will always be null which yields a create path.
        Ballot? existingBallot = null;

        if (!isTestRequest)
        {
            existingBallot = await _db.Ballots
                .Include(b => b.Vote)
                    .ThenInclude(v => v.AuditableEvent)
                .FirstOrDefaultAsync(b =>
                    b.AdmissionTicketId == ticketEntity.Id &&
                    b.VotationId == votation.Id);
        }

        // --- WRITE PHASES (start transactions only when needed) ---
        try
        {
            if (existingBallot != null)
            {
                // Update existing ballot - start transaction for atomic write
                await using var tx = await _db.Database.BeginTransactionAsync();

                // Capture old option before mutation for correct audit metadata
                var oldOptionId = existingBallot.VoteOptionId;

                existingBallot.VoteOptionId = request.VoteOptionId;
                existingBallot.CastAtUtc = DateTime.UtcNow;

                var isTestCode = isTestRequest; // false for real tickets

                if (!isTestCode)
                {
                    // Create or update audit event for the change (only for non-test tickets)
                    var existingEvent = existingBallot.Vote?.AuditableEvent;

                    var metadata = $"Changed from option {oldOptionId} to {request.VoteOptionId}";

                    if (existingEvent == null)
                    {
                        var changeEvent = new AuditableEvent
                        {
                            Id = Guid.NewGuid(),
                            VoteId = existingBallot.Vote != null ? existingBallot.Vote.Id : Guid.Empty,
                            EventType = "VoteChanged",
                            Metadata = metadata,
                            TimestampUtc = DateTime.UtcNow
                        };

                        _db.AuditableEvents.Add(changeEvent);
                    }
                    else
                    {
                        existingEvent.EventType = "VoteChanged";
                        existingEvent.Metadata = metadata;
                        existingEvent.TimestampUtc = DateTime.UtcNow;
                        _db.AuditableEvents.Update(existingEvent);
                    }
                }

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                _logger.LogInformation("[VoteUpdated] TicketId={TicketId} VotationId={VotationId} OldOption={OldOption} NewOption={NewOption} Commit=Completed",
                    ticketEntity.Id, votation.Id, oldOptionId, request.VoteOptionId);

                // Broadcast after commit
                await _broadcast.VoteChanged(
                    request.MeetingId.ToString(),
                    request.PropositionId.ToString(),
                    votation.Id.ToString());

                return Ok(new
                {
                    Message = "Vote updated successfully",
                    BallotId = existingBallot.Id,
                    VoteId = existingBallot.Vote != null ? existingBallot.Vote.Id : (Guid?)null,
                    VotationId = votation.Id,
                    Action = "Updated"
                });
            }

            // No existing ballot -> create new ballot + vote. For TESTCODE we must
            // ensure the generated ephemeral ticket is persisted as part of the
            // same transaction that creates the ballot and vote.
            await using var txCreate = await _db.Database.BeginTransactionAsync();

            // If this is a TEST request, persist the generated ticket now so the
            // ballot will reference a real AdmissionTicket row.
            if (isTestRequest)
            {
                _db.AdmissionTickets.Add(ticketEntity);
            }

            // Create ballot + vote (and audit event unless skipAudit)
            var skipAudit = isTestRequest;
            var (ballot, vote) = await CreateAndSaveVoteAsync(ticketEntity, votation, request.VoteOptionId, skipAudit);

            await txCreate.CommitAsync();

            _logger.LogInformation("[VoteCreated] TicketId={TicketId} VotationId={VotationId} BallotId={BallotId} VoteId={VoteId} Commit=Completed",
                ticketEntity.Id, votation.Id, ballot.Id, vote.Id);

            // Broadcast after commit
            await _broadcast.VoteCast(
                request.MeetingId.ToString(),
                request.PropositionId.ToString(),
                votation.Id.ToString());

            return Ok(new
            {
                Message = "Vote cast successfully",
                BallotId = ballot.Id,
                VoteId = vote.Id,
                VotationId = votation.Id,
                Action = "Created",
                // For test requests, include the ephemeral ticket code so callers can inspect it if needed
                TestTicketCode = isTestRequest ? generatedTestTicketCode : null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error casting vote for meeting {MeetingId}, proposition {PropositionId}",
                request.MeetingId, request.PropositionId);
            // Do not return raw exception details to client
            return StatusCode(500, "An error occurred while casting the vote.");
        }
    }

    // Helper: create ballot + vote, optionally create an auditable event (skipped for test tickets)
    private async Task<(Ballot, Vote)> CreateAndSaveVoteAsync(AdmissionTicket ticket, Votation votation, Guid voteOptionId, bool skipAudit)
    {
        var ballot = new Ballot
        {
            Id = Guid.NewGuid(),
            AdmissionTicketId = ticket.Id,
            VotationId = votation.Id,
            VoteOptionId = voteOptionId,
            CastAtUtc = DateTime.UtcNow
        };

        _db.Ballots.Add(ballot);

        var vote = new Vote
        {
            Id = Guid.NewGuid(),
            BallotId = ballot.Id,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Votes.Add(vote);

        if (!skipAudit)
        {
            var auditEvent = new AuditableEvent
            {
                Id = Guid.NewGuid(),
                VoteId = vote.Id,
                EventType = "VoteCast",
                Metadata = $"Vote cast on votation {votation.Id}",
                TimestampUtc = DateTime.UtcNow
            };

            _db.AuditableEvents.Add(auditEvent);
        }

        // Mark ticket as used (if not already)
        if (!ticket.Used)
        {
            ticket.Used = true;
        }

        // Save everything within the caller's transaction
        await _db.SaveChangesAsync();

        return (ballot, vote);
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
        AdmissionTicket? ticket;

        if (code == "TESTCODE")
        {
            // Scope TESTCODE to the votation's meeting and generate a unique test ticket per request
            var votation = await _db.Votations.FirstOrDefaultAsync(v => v.Id == votationId);
            if (votation == null)
            {
                return NotFound("Votation not found.");
            }

            // Option A: create a unique TESTCODE-{Guid} ticket per request and persist it.
            var generatedCode = $"TESTCODE-{Guid.NewGuid():N}";
            ticket = new AdmissionTicket
            {
                Id = Guid.NewGuid(),
                MeetingId = votation.MeetingId,
                Code = generatedCode,
                Used = false
            };

            _db.AdmissionTickets.Add(ticket);
            await _db.SaveChangesAsync();

            _logger.LogInformation("[CheckIfVoted][TestTicket] Persisted ephemeral test ticket {TicketCode} (Id: {TicketId}) for meeting {MeetingId}",
                generatedCode, ticket.Id, votation.MeetingId);
        }
        else
        {
            ticket = await _db.AdmissionTickets
                .FirstOrDefaultAsync(t => t.Code == code);

            if (ticket == null)
            {
                return NotFound("Invalid admission ticket code.");
            }
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
                VoteOptionLabel = b.VoteOption != null ? b.VoteOption.Label : null,
                CastAt = b.CastAtUtc,
                EventType = b.Vote != null && b.Vote.AuditableEvent != null ? b.Vote.AuditableEvent.EventType : null
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
            var existingEvent = ballot.Vote?.AuditableEvent;
            if (existingEvent == null)
            {
                var revocationEvent = new AuditableEvent
                {
                    Id = Guid.NewGuid(),
                    VoteId = ballot.Vote.Id,
                    EventType = "VoteRevoked",
                    Metadata = $"Vote revoked by admin at {DateTime.UtcNow}",
                    TimestampUtc = DateTime.UtcNow
                };

                _db.AuditableEvents.Add(revocationEvent);
            }
            else
            {
                existingEvent.EventType = "VoteRevoked";
                existingEvent.Metadata = $"Vote revoked by admin at {DateTime.UtcNow}";
                existingEvent.TimestampUtc = DateTime.UtcNow;
                _db.AuditableEvents.Update(existingEvent);
            }
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
