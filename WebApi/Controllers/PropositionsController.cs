// WebApi/Controllers/PropositionsController.cs
using Application.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using Application.Propositions.Queries.GetPropositions;
using Application.Propositions.Commands.CreateProposition;
using Application.Propositions.Commands.UpdateProposition;
using Application.Propositions.Commands.DeleteProposition;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings/{meetingId:guid}/agenda/{itemId:guid}/propositions")]
public class PropositionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PropositionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: /api/meetings/{meetingId}/agenda/{itemId}/propositions
    // Query params: includeVoteOptions=true, includeVotations=true
    [HttpGet]
    public async Task<IActionResult> Get(Guid meetingId, Guid itemId,
        [FromQuery] bool includeVoteOptions = false,
        [FromQuery] bool includeVotations = false)
    {
        try
        {
            var items = await _mediator.Send(new GetPropositionsQuery(meetingId, itemId, includeVoteOptions, includeVotations));

            if (!includeVoteOptions && !includeVotations)
            {
                var list = items.Select(p => new { p.Id, p.Question, p.VoteType }).ToList();
                return Ok(list);
            }

            var detailed = items.Select(p => new
            {
                p.Id,
                p.Question,
                p.VoteType,
                VoteOptions = p.VoteOptions?.Select(o => new { o.Id, o.Label }).ToList(),
                Votations = p.Votations?.Select(v => new { v.Id, v.MeetingId, v.PropositionId, v.StartedAtUtc, v.EndedAtUtc, v.Open, v.Overwritten }).ToList(),
                IsOpen = p.IsOpen
            }).ToList();

            return Ok(detailed);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    public record CreatePropositionRequest(string Question, string VoteType);

    // POST
    [HttpPost]
    public async Task<IActionResult> Create(Guid meetingId, Guid itemId, [FromBody] CreatePropositionRequest req)
    {
        try
        {
            var res = await _mediator.Send(new CreatePropositionCommand(meetingId, itemId, req.Question, req.VoteType));
            return Ok(new { res.Id, res.Question, res.VoteType });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    public record UpdatePropositionRequest(string? Question, string? VoteType);

    // PATCH
    [HttpPatch("{propId:guid}")]
    public async Task<IActionResult> Update(Guid meetingId, Guid itemId, Guid propId, [FromBody] UpdatePropositionRequest req)
    {
        try
        {
            var res = await _mediator.Send(new UpdatePropositionCommand(meetingId, itemId, propId, req.Question, req.VoteType));
            return Ok(new { res.Id, res.Question, res.VoteType });
        }
        catch (KeyNotFoundException ex)
        {
            if (ex.Message.Contains("Proposition"))
            {
                return NotFound();
            }

            return NotFound(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    // DELETE
    [HttpDelete("{propId:guid}")]
    public async Task<IActionResult> Delete(Guid meetingId, Guid itemId, Guid propId)
    {
        try
        {
            await _mediator.Send(new DeletePropositionCommand(meetingId, itemId, propId));
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            if (ex.Message.Contains("Proposition"))
            {
                return NotFound();
            }

            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }
}
