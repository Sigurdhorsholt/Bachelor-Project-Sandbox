using Microsoft.AspNetCore.Mvc;
using MediatR;
using Application.Agendas.Queries.GetAgenda;
using Application.Agendas.Queries.GetAgendaSimple;
using Application.Agendas.Commands.CreateAgendaItem;
using Application.Agendas.Commands.UpdateAgendaItem;
using Application.Agendas.Commands.DeleteAgendaItem;
using Microsoft.AspNetCore.Authorization;
using WebApi.DTOs;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings/{meetingId:guid}/agenda")]
public class AgendaController : ControllerBase
{
    private readonly IMediator _mediator;
    public AgendaController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAgenda(Guid meetingId, [FromQuery] bool includePropositions = false)
    {
        try
        {
            if (!includePropositions)
            {
                var items = await _mediator.Send(new GetAgendaSimpleQuery(meetingId));
                return Ok(items);
            }

            var result = await _mediator.Send(new GetAgendaQuery(meetingId, true));
            return Ok(result.Items);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    // POST: /api/meetings/{meetingId}/agenda
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create(Guid meetingId, [FromBody] CreateAgendaItemRequest req)
    {
        try
        {
            var res = await _mediator.Send(new CreateAgendaItemCommand(meetingId, req.Title, req.Description));
            return Ok(new { res.Id, res.Title, res.Description });
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

    // PATCH: /api/meetings/{meetingId}/agenda/{itemId}
    [HttpPatch("{itemId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(Guid meetingId, Guid itemId, [FromBody] UpdateAgendaItemRequest req)
    {
        try
        {
            var res = await _mediator.Send(new UpdateAgendaItemCommand(meetingId, itemId, req.Title, req.Description));
            return Ok(new { res.Id, res.Title, res.Description });
        }
        catch (KeyNotFoundException ex)
        {
            if (ex.Message.Contains("Agenda item"))
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

    // DELETE: /api/meetings/{meetingId}/agenda/{itemId}
    [HttpDelete("{itemId:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid meetingId, Guid itemId)
    {
        try
        {
            await _mediator.Send(new DeleteAgendaItemCommand(meetingId, itemId));
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            if (ex.Message.Contains("Agenda item"))
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
