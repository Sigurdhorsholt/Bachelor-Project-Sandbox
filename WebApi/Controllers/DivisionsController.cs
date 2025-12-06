// WebApi/Controllers/DivisionsController.cs

using System.Text.Json.Serialization;
using Application.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

using Application.Divisions.Queries.GetMeetings;
using Application.Divisions.Commands.CreateMeeting;

namespace WebApi.Controllers;

[ApiController]
[Route("api/divisions")]
public class DivisionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DivisionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: /api/divisions/{divisionId}/meetings
    [HttpGet("{divisionId:guid}/meetings")]
    public async Task<IActionResult> GetMeetings(Guid divisionId)
    {
        try
        {
            var items = await _mediator.Send(new GetMeetingsQuery(divisionId));
            return Ok(items);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    public record CreateMeetingRequest(
        string Title,
        DateTime StartsAtUtc,
        [property: JsonConverter(typeof(JsonStringEnumConverter))] MeetingStatus Status
    );

    // POST: /api/divisions/{divisionId}/meetings
    [HttpPost("{divisionId:guid}/meetings")]
    public async Task<IActionResult> CreateMeeting(Guid divisionId, [FromBody] CreateMeetingRequest req)
    {
        try
        {
            var cmd = new CreateMeetingCommand(divisionId, req.Title, req.StartsAtUtc, req.Status);
            var result = await _mediator.Send(cmd);

            return Ok(new
            {
                result.Id,
                result.Title,
                StartsAtUtc = result.StartsAtUtc,
                Status = result.Status,
                MeetingCode = result.MeetingCode
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, ex.Message);
        }
    }
}
