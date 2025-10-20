using Application.Persistence;
using Application.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/organisations")]
public class OrganisationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<OrganisationsController> _logger;

    public OrganisationsController(AppDbContext db, ILogger<OrganisationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET: /api/organisations
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orgs = await _db.Organisations
            .AsNoTracking()
            .Select(o => new
            {
                o.Id,
                o.Name
            })
            .ToListAsync();

        return Ok(orgs);
    }

    // GET: /api/organisations/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var org = await _db.Organisations
            .Include(o => o.Divisions)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);

        if (org == null)
            return NotFound();

        return Ok(new
        {
            org.Id,
            org.Name,
            Divisions = org.Divisions.Select(d => new { d.Id, d.Name })
        });
    }

    // POST: /api/organisations
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrganisationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var entity = new Organisation
        {
            Id = Guid.NewGuid(),
            Name = request.Name
        };

        _db.Organisations.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new
        {
            entity.Id,
            entity.Name
        });
    }

    // GET: /api/organisations/{orgId}/divisions
    [HttpGet("{orgId:guid}/divisions")]
    public async Task<IActionResult> GetDivisions(Guid orgId)
    {
        var orgExists = await _db.Organisations.AnyAsync(o => o.Id == orgId);
        if (!orgExists)
            return NotFound("Organisation not found.");

        var divisions = await _db.Divisions
            .Where(d => d.OrganisationId == orgId)
            .AsNoTracking()
            .Select(d => new { d.Id, d.Name })
            .ToListAsync();

        return Ok(divisions);
    }

    // POST: /api/organisations/{orgId}/divisions
    [HttpPost("{orgId:guid}/divisions")]
    public async Task<IActionResult> CreateDivision(Guid orgId, [FromBody] CreateDivisionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Division name is required.");

        var org = await _db.Organisations.FindAsync(orgId);
        if (org == null)
            return NotFound("Organisation not found.");

        var division = new Division
        {
            Id = Guid.NewGuid(),
            OrganisationId = org.Id,
            Name = request.Name
        };

        _db.Divisions.Add(division);
        await _db.SaveChangesAsync();

        return Ok(new { division.Id, division.Name });
    }
}

public record CreateOrganisationRequest(string Name);
public record CreateDivisionRequest(string Name);
