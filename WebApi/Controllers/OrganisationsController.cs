using System;
using System.Threading.Tasks;
using Application.Persistence;
using Application.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Application.Organisations.Queries.GetAll;
using Application.Organisations.Queries.GetById;
using Application.Organisations.Queries.GetDivisions;
using Application.Organisations.Commands.CreateOrganisation;
using Application.Organisations.Commands.CreateDivision;
using Microsoft.AspNetCore.Authorization;
using WebApi.DTOs;

namespace WebApi.Controllers;

[ApiController]
[Route("api/organisations")]
public class OrganisationsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<OrganisationsController> _logger;

    public OrganisationsController(IMediator mediator, ILogger<OrganisationsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    // GET: /api/organisations
    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll()
    {
        var orgs = await _mediator.Send(new GetAllOrganisationsQuery());
        return Ok(orgs);
    }

    // GET: /api/organisations/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var org = await _mediator.Send(new GetOrganisationQuery(id));

            return Ok(new
            {
                org.Id,
                org.Name,
                Divisions = org.Divisions.Select(d => new { d.Id, d.Name })
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    // POST: /api/organisations
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateOrganisationRequest request)
    {
        try
        {
            var res = await _mediator.Send(new CreateOrganisationCommand(request.Name));

            return CreatedAtAction(nameof(GetById), new { id = res.Id }, new { res.Id, res.Name });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // GET: /api/organisations/{orgId}/divisions
    [HttpGet("{orgId:guid}/divisions")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetDivisions(Guid orgId)
    {
        try
        {
            var divisions = await _mediator.Send(new GetDivisionsQuery(orgId));
            return Ok(divisions.Select(d => new { d.Id, d.Name }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    // POST: /api/organisations/{orgId}/divisions
    [HttpPost("{orgId:guid}/divisions")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> CreateDivision(Guid orgId, [FromBody] CreateDivisionRequest request)
    {
        try
        {
            var res = await _mediator.Send(new CreateDivisionCommand(orgId, request.Name));
            return Ok(new { res.Id, res.Name });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}
