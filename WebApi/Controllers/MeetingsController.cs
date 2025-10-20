using System.Collections.Concurrent;
using System.Text.Json.Serialization;
using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/meetings")]
public class MeetingsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MeetingsController(AppDbContext db) { _db = db; }

    // In-memory access state (avoid DB schema changes for now)
    private static readonly ConcurrentDictionary<Guid, AccessState> AccessStates = new();
    private record AccessState(string MeetingCode, string AccessMode);

    private static readonly string ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static string GenerateCode(int len) => string.Join("", Enumerable.Range(0, len).Select(_ => ALPH[Random.Shared.Next(ALPH.Length)]));

    // GET /api/meetings/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMeeting(Guid id)
    {
        var meeting = await _db.Meetings
            .Include(m => m.AgendaItems).ThenInclude(a => a.Propositions)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id);
        if (meeting == null) return NotFound("Meeting not found.");

        return Ok(new
        {
            meeting.Id,
            meeting.Title,
            StartsAtUtc = meeting.StartsAtUtc,
            Status = meeting.Status.ToString(),
            Agenda = meeting.AgendaItems
                .OrderBy(a => a.CreatedOrder()) // custom ordering fallback (extension below)
                .Select(a => new
                {
                    a.Id,
                    a.Title,
                    Propositions = a.Propositions.Select(p => new { p.Id, Title = p.Question }).ToList()
                }).ToList()
        });
    }

    // PATCH /api/meetings/{id}
    public record PatchMeetingRequest(string? Title, DateTime? StartsAtUtc, [property: JsonConverter(typeof(JsonStringEnumConverter))] MeetingStatus? Status);
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> PatchMeeting(Guid id, [FromBody] PatchMeetingRequest req)
    {
        var meeting = await _db.Meetings.FindAsync(id);
        if (meeting == null) return NotFound("Meeting not found.");

        if (req.Title != null)
        {
            if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest("Title cannot be empty.");
            meeting.Title = req.Title.Trim();
        }
        if (req.StartsAtUtc != null) meeting.StartsAtUtc = req.StartsAtUtc.Value;
        if (req.Status != null) meeting.Status = req.Status.Value;

        await _db.SaveChangesAsync();
        return Ok(new { meeting.Id });
    }

    // Agenda operations
    public record CreateAgendaItemRequest(string Title);
    // POST /api/meetings/{id}/agenda
    [HttpPost("{id:guid}/agenda")]
    public async Task<IActionResult> CreateAgendaItem(Guid id, [FromBody] CreateAgendaItemRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Title)) return BadRequest("Title required.");
        var meetingExists = await _db.Meetings.AnyAsync(m => m.Id == id);
        if (!meetingExists) return NotFound("Meeting not found.");
        var item = new AgendaItem { Id = Guid.NewGuid(), MeetingId = id, Title = body.Title.Trim() };
        _db.AgendaItems.Add(item);
        await _db.SaveChangesAsync();
        return Ok(new { item.Id, item.Title });
    }

    public record PatchAgendaItemRequest(string? Title);
    // PATCH /api/meetings/{id}/agenda/{itemId}
    [HttpPatch("{id:guid}/agenda/{itemId:guid}")]
    public async Task<IActionResult> PatchAgendaItem(Guid id, Guid itemId, [FromBody] PatchAgendaItemRequest body)
    {
        var item = await _db.AgendaItems.FirstOrDefaultAsync(a => a.Id == itemId && a.MeetingId == id);
        if (item == null) return NotFound("Agenda item not found.");
        if (body.Title != null)
        {
            if (string.IsNullOrWhiteSpace(body.Title)) return BadRequest("Title cannot be empty.");
            item.Title = body.Title.Trim();
        }
        await _db.SaveChangesAsync();
        return Ok(new { item.Id, item.Title });
    }

    // DELETE /api/meetings/{id}/agenda/{itemId}
    [HttpDelete("{id:guid}/agenda/{itemId:guid}")]
    public async Task<IActionResult> DeleteAgendaItem(Guid id, Guid itemId)
    {
        var item = await _db.AgendaItems.FirstOrDefaultAsync(a => a.Id == itemId && a.MeetingId == id);
        if (item == null) return NotFound();
        _db.AgendaItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public record CreatePropositionRequest(string Question);
    // POST /api/meetings/{id}/agenda/{itemId}/propositions
    [HttpPost("{id:guid}/agenda/{itemId:guid}/propositions")]
    public async Task<IActionResult> CreateProposition(Guid id, Guid itemId, [FromBody] CreatePropositionRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Question)) return BadRequest("Question required.");
        var item = await _db.AgendaItems.FirstOrDefaultAsync(a => a.Id == itemId && a.MeetingId == id);
        if (item == null) return NotFound("Agenda item not found.");
        var prop = new Proposition { Id = Guid.NewGuid(), AgendaItemId = itemId, Question = body.Question.Trim() };
        _db.Propositions.Add(prop);
        await _db.SaveChangesAsync();
        return Ok(new { prop.Id, Title = prop.Question });
    }

    // Access + codes endpoints
    public record AccessResponse(Guid MeetingId, string MeetingCode, string AccessMode, int TotalCodes, int UsedCodes);
    // GET /api/meetings/{id}/access
    [HttpGet("{id:guid}/access")]
    public async Task<IActionResult> GetAccess(Guid id)
    {
        var exists = await _db.Meetings.AnyAsync(m => m.Id == id);
        if (!exists) return NotFound("Meeting not found.");
        var state = AccessStates.GetOrAdd(id, _ => new AccessState(GenerateCode(6), "qr"));
        var total = await _db.AdmissionTickets.CountAsync(t => t.MeetingId == id);
        var used = await _db.AdmissionTickets.CountAsync(t => t.MeetingId == id && t.Used);
        return Ok(new AccessResponse(id, state.MeetingCode, state.AccessMode, total, used));
    }

    public record UpdateAccessRequest(string? MeetingCode, string? AccessMode);
    // PUT /api/meetings/{id}/access
    [HttpPut("{id:guid}/access")]
    public async Task<IActionResult> UpdateAccess(Guid id, [FromBody] UpdateAccessRequest body)
    {
        var exists = await _db.Meetings.AnyAsync(m => m.Id == id);
        if (!exists) return NotFound("Meeting not found.");
        AccessStates.AddOrUpdate(id,
            _ => new AccessState(body.MeetingCode ?? GenerateCode(6), body.AccessMode ?? "qr"),
            (_, prev) => new AccessState(body.MeetingCode ?? prev.MeetingCode, body.AccessMode ?? prev.AccessMode));
        return await GetAccess(id);
    }

    public record TicketResponse(Guid Id, string Code, bool Used);
    // GET /api/meetings/{id}/codes
    [HttpGet("{id:guid}/codes")]
    public async Task<IActionResult> GetCodes(Guid id)
    {
        var exists = await _db.Meetings.AnyAsync(m => m.Id == id);
        if (!exists) return NotFound("Meeting not found.");
        var codes = await _db.AdmissionTickets
            .Where(t => t.MeetingId == id)
            .OrderByDescending(t => t.Id)
            .Select(t => new TicketResponse(t.Id, t.Code, t.Used))
            .ToListAsync();
        return Ok(codes);
    }

    // POST /api/meetings/{id}/codes?count=n
    [HttpPost("{id:guid}/codes")]
    public async Task<IActionResult> GenerateCodes(Guid id, [FromQuery] int count = 1)
    {
        if (count <= 0 || count > 200) return BadRequest("Count must be between 1 and 200.");
        var exists = await _db.Meetings.AnyAsync(m => m.Id == id);
        if (!exists) return NotFound("Meeting not found.");
        var created = new List<TicketResponse>();
        for (int i = 0; i < count; i++)
        {
            var ticket = new AdmissionTicket { Id = Guid.NewGuid(), MeetingId = id, Code = GenerateCode(8), Used = false };
            _db.AdmissionTickets.Add(ticket);
            created.Add(new TicketResponse(ticket.Id, ticket.Code, ticket.Used));
        }
        await _db.SaveChangesAsync();
        return Ok(created);
    }
}

// Helper extension for ordering agenda items deterministically without explicit order column.
static class AgendaItemExtensions
{
    public static int CreatedOrder(this AgendaItem item) => item.Id.GetHashCode();
}