using Application.Services;
using Microsoft.AspNetCore.Mvc;
using WebApi.Realtime;
using Microsoft.AspNetCore.Authorization;

namespace WebApi.Controllers;

[ApiController]
[Route("api/votation/")]
[Authorize]
public class VotationController : ControllerBase
{
    private readonly IMeetingBroadcaster _broadcast;
    private readonly IVotingService _votingService;

    public VotationController(
        IMeetingBroadcaster broadcaster,
        IVotingService votingService)
    {
        _broadcast = broadcaster;
        _votingService = votingService;
    }

    /// <summary>
    /// Start a votation for a proposition in a meeting
    /// </summary>
    [HttpPost("start/{meetingId:guid}/{propositionId:guid}")]
    public async Task<IActionResult> StartVoteAndCreateVotation(Guid meetingId, Guid propositionId)
    {
        try
        {
            var result = await _votingService.StartVotationAsync(meetingId, propositionId);
            
            // Broadcast the votation opened event
            await _broadcast.MeetingPropositionOpened(
                meetingId.ToString(),
                propositionId.ToString(),
                result.VotationId.ToString());

            return Ok(new
            {
                result.VotationId,
                result.MeetingId,
                result.PropositionId,
                result.StartedAtUtc,
                result.Open
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while starting the votation.");
        }
    }

    /// <summary>
    /// Stop an open votation for a proposition
    /// </summary>
    [HttpPost("stop/{propositionId:guid}")]
    public async Task<IActionResult> StopVotation(Guid propositionId)
    {
        try
        {
            var result = await _votingService.StopVotationAsync(propositionId);

            // Broadcast the votation stopped event
            await _broadcast.MeetingVotationStopped(
                result.MeetingId.ToString(),
                result.PropositionId.ToString(),
                result.VotationId.ToString(),
                result.EndedAtUtc);

            return Ok(new
            {
                result.VotationId,
                result.MeetingId,
                result.PropositionId,
                result.EndedAtUtc,
                Open = false
            });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while stopping the votation.");
        }
    }

    /// <summary>
    /// Get a votation by ID
    /// </summary>
    [HttpGet("{votationId:guid}")]
    public async Task<IActionResult> GetVotation(Guid votationId)
    {
        var votation = await _votingService.GetVotationAsync(votationId);
        
        if (votation == null)
        {
            return NotFound();
        }

        return Ok(votation);
    }

    /// <summary>
    /// Get all open votations for a meeting
    /// </summary>
    [HttpGet("open-votes/{meetingId:guid}")]
    public async Task<IActionResult> GetOpenVotationsForMeeting(Guid meetingId)
    {
        try
        {
            var openVotations = await _votingService.GetOpenVotationsForMeetingAsync(meetingId);
            return Ok(openVotations);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while retrieving open votations.");
        }
    }

    /// <summary>
    /// Get all votations for a specific proposition in a meeting
    /// </summary>
    [HttpGet("by-proposition/{meetingId:guid}/{propositionId:guid}")]
    public async Task<IActionResult> GetVotationsByProposition(Guid meetingId, Guid propositionId)
    {
        try
        {
            var votations = await _votingService.GetVotationsByPropositionAsync(meetingId, propositionId);
            return Ok(votations);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while retrieving votations.");
        }
    }

    /// <summary>
    /// Get vote results for a votation
    /// </summary>
    [HttpGet("results/{votationId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetVotationResults(Guid votationId)
    {
        try
        {
            var results = await _votingService.GetVotationResultsAsync(votationId);
            return Ok(results);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while retrieving votation results.");
        }
    }

    /// <summary>
    /// Start a re-vote for a proposition (closes existing votations and marks them as overwritten)
    /// </summary>
    [HttpPost("revote/{propositionId:guid}")]
    public async Task<IActionResult> StartReVote(Guid propositionId)
    {
        try
        {
            var result = await _votingService.StartRevoteAsync(propositionId);

            // If we closed an open votation, broadcast that it stopped
            if (result.LatestVotationId.HasValue && result.MeetingId.HasValue && result.EndedAtUtc.HasValue)
            {
                await _broadcast.MeetingVotationStopped(
                    result.MeetingId.Value.ToString(),
                    propositionId.ToString(),
                    result.LatestVotationId.Value.ToString(),
                    result.EndedAtUtc.Value);
            }

            return Ok(new
            {
                Message = $"Closed {result.ClosedVotationsCount} votation(s)",
                result.ClosedVotationsCount,
                result.LatestVotationId,
                result.MeetingId,
                result.PropositionId
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while starting the revote.");
        }
    }

    /// <summary>
    /// Add manual ballots for paper votes cast physically during a meeting
    /// </summary>
    [HttpPost("{votationId:guid}/manual-ballots")]
    public async Task<IActionResult> AddManualBallots(Guid votationId, [FromBody] ManualBallotRequest request)
    {
        try
        {
            if (request?.Counts == null || !request.Counts.Any())
            {
                return BadRequest("At least one vote option with a count is required.");
            }

            var result = await _votingService.AddManualBallotsAsync(votationId, request.Counts, request.Notes);

            // Broadcast vote cast event to trigger real-time updates
            var votation = await _votingService.GetVotationAsync(votationId);
            if (votation != null)
            {
                await _broadcast.VoteCast(
                    votation.MeetingId.ToString(),
                    votation.PropositionId.ToString(),
                    votationId.ToString());
            }

            return Ok(new
            {
                result.TotalBallotsAdded,
                result.VotationId,
                result.RecordedAtUtc,
                result.CountsByOption
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, "An error occurred while adding manual ballots.");
        }
    }
}

public class ManualBallotRequest
{
    public Dictionary<Guid, int> Counts { get; set; } = new();
    public string? Notes { get; set; }
}