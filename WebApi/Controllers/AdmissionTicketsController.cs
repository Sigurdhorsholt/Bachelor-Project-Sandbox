using Microsoft.AspNetCore.Mvc;
using WebApi.Services;
using Microsoft.Extensions.Logging;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings/{meetingId:guid}/codes")]
public class AdmissionTicketsController : ControllerBase
{
    private readonly IAdmissionTicketService _service;
    private readonly ILogger<AdmissionTicketsController> _logger;

    public AdmissionTicketsController(IAdmissionTicketService service, ILogger<AdmissionTicketsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid meetingId)
    {
        var list = await _service.GetForMeetingAsync(meetingId);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Generate(Guid meetingId, [FromQuery] int count = 0)
    {
        if (count < 0 || count > 10000) return BadRequest("Count must be between 0 and 10000");
        try
        {
            await _service.GenerateAsync(meetingId, count);
            var list = await _service.GetForMeetingAsync(meetingId);
            return Ok(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate admission tickets for {MeetingId}", meetingId);
            return StatusCode(500, "Failed to generate tickets: " + ex.Message);
        }
    }

    [HttpDelete]
    public async Task<IActionResult> Clear(Guid meetingId)
    {
        try
        {
            await _service.ClearAsync(meetingId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear admission tickets for {MeetingId}", meetingId);
            return StatusCode(500, "Failed to clear tickets: " + ex.Message);
        }
    }

    [HttpPost("replace")]
    public async Task<IActionResult> Replace(Guid meetingId, [FromQuery] int count = 0)
    {
        if (count < 0 || count > 10000) return BadRequest("Count must be between 0 and 10000");
        try
        {
            await _service.ReplaceAsync(meetingId, count);
            var list = await _service.GetForMeetingAsync(meetingId);
            return Ok(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to replace admission tickets for {MeetingId}", meetingId);
            return StatusCode(500, "Failed to replace tickets: " + ex.Message);
        }
    }
}
