using Application.Services;
using Microsoft.AspNetCore.Mvc;
using WebApi.Realtime;
using Microsoft.AspNetCore.Authorization;
using WebApi.DTOs;

namespace WebApi.Controllers;

[ApiController]
[Route("api/vote")]
public class VoteController : ControllerBase
{
    private readonly IMeetingBroadcaster _broadcast;
    private readonly ILogger<VoteController> _logger;
    private readonly IVotingService _votingService;

    public VoteController(
        IMeetingBroadcaster broadcaster,
        ILogger<VoteController> logger,
        IVotingService votingService)
    {
        _broadcast = broadcaster;
        _logger = logger;
        _votingService = votingService;
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

        try
        {
            var result = await _votingService.CastVoteAsync(
                request.MeetingId,
                request.PropositionId,
                request.VoteOptionId,
                request.Code);

            // Broadcast based on action type
            if (result.Action == "Created")
            {
                await _broadcast.VoteCast(
                    request.MeetingId.ToString(),
                    request.PropositionId.ToString(),
                    result.VotationId.ToString());
            }
            else if (result.Action == "Updated")
            {
                await _broadcast.VoteChanged(
                    request.MeetingId.ToString(),
                    request.PropositionId.ToString(),
                    result.VotationId.ToString());
            }

            return Ok(new
            {
                Message = result.Action == "Created" ? "Vote cast successfully" : "Vote updated successfully",
                result.BallotId,
                result.VoteId,
                result.VotationId,
                result.Action,
                result.TestTicketCode
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Validation error while casting vote");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
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
        try
        {
            var results = await _votingService.GetVotationResultsAsync(votationId);
            return Ok(results);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Votation not found: {VotationId}", votationId);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving votation results for {VotationId}", votationId);
            return StatusCode(500, "An error occurred while retrieving votation results.");
        }
    }

    /// <summary>
    /// Check if an admission ticket has voted in a specific votation
    /// </summary>
    [HttpGet("check/{code}/{votationId:guid}")]
    [Authorize(Policy = "AttendeeOnly")]
    public async Task<IActionResult> CheckIfVoted(string code, Guid votationId)
    {
        try
        {
            var result = await _votingService.CheckIfVotedAsync(code, votationId);

            if (!result.HasVoted)
            {
                return Ok(new { HasVoted = false, VotationId = votationId });
            }

            return Ok(new
            {
                HasVoted = true,
                result.VotationId,
                result.BallotId,
                result.VoteOptionId,
                result.VoteOptionLabel,
                result.CastAt
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid ticket or votation");
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking vote status for votation {VotationId}", votationId);
            return StatusCode(500, "An error occurred while checking vote status.");
        }
    }

    /// <summary>
    /// Get all votes for a meeting (admin endpoint)
    /// </summary>
    [HttpGet("meeting/{meetingId:guid}/all")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAllVotesForMeeting(Guid meetingId)
    {
        try
        {
            var votes = await _votingService.GetAllVotesForMeetingAsync(meetingId);
            return Ok(votes);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Meeting not found: {MeetingId}", meetingId);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving votes for meeting {MeetingId}", meetingId);
            return StatusCode(500, "An error occurred while retrieving votes.");
        }
    }

    /// <summary>
    /// Revoke/delete a vote (admin endpoint)
    /// </summary>
    [HttpDelete("{ballotId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> RevokeVote(Guid ballotId)
    {
        try
        {
            await _votingService.RevokeVoteAsync(ballotId);
            return Ok(new { Message = "Vote revoked successfully" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Cannot revoke vote: {BallotId}", ballotId);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking vote for ballot {BallotId}", ballotId);
            return StatusCode(500, "An error occurred while revoking the vote.");
        }
    }
}
