// WebApi/Controllers/MeetingsController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using MediatR;
using Application.Meetings.Queries;
using Application.Meetings.Commands;
using Application.Services;
using WebApi.DTOs;
using Application.Domain.Entities;
using WebApi.Realtime;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings")]
public class MeetingsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IMeetingBroadcaster _broadcast;

    public MeetingsController(IMediator mediator, IMeetingBroadcaster broadcast)
    {
        _mediator = mediator;
        _broadcast = broadcast;
    }

    // GET: /api/meetings/{id}
    // Returns only meeting metadata (no nested agenda/propositions)
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "AdminOrAttendee")]
    public async Task<IActionResult> GetMeetingById(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetMeetingByIdQuery(id), ct);
        
        if (result is null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    // PATCH: /api/meetings/{id}
    [HttpPatch("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] UpdateMeetingRequest req, CancellationToken ct)
    {
        var command = new UpdateMeetingCommand(
            id,
            req.Title,
            req.StartsAtUtc,
            req.Status,
            req.RegenerateMeetingCode ?? false
        );

        var result = await _mediator.Send(command, ct);

        if (!result.Success)
        {
            if (result.ErrorMessage == "Meeting not found")
                return NotFound();
            if (result.ErrorMessage == "Finished meetings cannot be edited.")
                return Conflict(result.ErrorMessage);
            if (result.ErrorMessage == "Title cannot be empty.")
                return BadRequest(result.ErrorMessage);
            return StatusCode(500, result.ErrorMessage);
        }

        return Ok(result.Data);
    }

    [HttpPost("{id}/start")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> StartMeeting(string id, CancellationToken ct)
    {
        var result = await _mediator.Send(new StartMeetingCommand(Guid.Parse(id)), ct);

        if (!result.Success)
        {
            return NotFound();
        }

        // Only broadcast if the meeting was actually started (not already started)
        if (!result.AlreadyStarted)
        {
            await _broadcast.MeetingStarted(result.MeetingId.ToString());
            await _broadcast.MeetingStateChanged(result.MeetingId.ToString(), result.NewState);
        }

        return NoContent();
    }

    [HttpPost("{id}/stop")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> StopMeeting(string id, CancellationToken ct)
    {
        var result = await _mediator.Send(new StopMeetingCommand(Guid.Parse(id)), ct);

        if (!result.Success)
        {
            return NotFound();
        }

        // Only broadcast if the meeting was actually stopped (not already stopped)
        if (!result.AlreadyStopped)
        {
            await _broadcast.MeetingStopped(result.MeetingId.ToString());
            await _broadcast.MeetingStateChanged(result.MeetingId.ToString(), result.NewState);
        }

        return NoContent();
    }

    // GET: /api/meetings/meta?id={meetingCode}
    [HttpGet("meta")]
    [Authorize(Policy = "AttendeeOnly")]
    public async Task<IActionResult> GetMeetingMeta([FromQuery] string meetingId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(meetingId))
        {
            return BadRequest("Meeting code is required.");
        }

        var result = await _mediator.Send(new GetMeetingMetaQuery(meetingId), ct);

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }

    // Debug endpoint to inspect current user's claims/roles
    [HttpGet("debug/claims")]
    [Authorize]
    public IActionResult DebugClaims()
    {
        var isAuthenticated = User?.Identity?.IsAuthenticated ?? false;
        var authType = User?.Identity?.AuthenticationType;
        var name = User?.Identity?.Name;
        var claims = User?.Claims.Select(c => new { c.Type, c.Value }).ToList() ?? [];
        var roles = User?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();

        return Ok(new { isAuthenticated, authType, name, roles, claims });
    }
}