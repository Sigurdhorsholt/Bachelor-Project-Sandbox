using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace WebApi.Realtime;

public class MeetingHub : Hub
{
    private readonly ILogger<MeetingHub> _logger;
    public MeetingHub(ILogger<MeetingHub> logger) => _logger = logger;

    public Task<string> Ping() => Task.FromResult("pongooooo");

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("connected", new { id = Context.ConnectionId, at = DateTime.UtcNow });
        _logger.LogInformation("SignalR connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }


    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("SignalR disconnected: {ConnectionId}. Error: {Error}", Context.ConnectionId, exception?.Message ?? "(none)");
        await base.OnDisconnectedAsync(exception);
    }
    
    public record TickDto(DateTime At, int N);

    /// <summary>
    /// Very basic test method. Call from frontend to prove round-trip.
    /// Logs on server, echoes ack to caller, and broadcasts to others.
    /// </summary>
    public async Task<string> Tick(TickDto dto)
    {
        try
        {
            _logger.LogInformation("SignalR tick: {ConnectionId}");

            // Simple echo for validation
            await Clients.Caller.SendAsync("TickAck", new { received = dto, conn = Context.ConnectionId });
            return $"ok:{dto.N}";
        }
        catch (Exception ex)
        {
            // Log details so you see them in backend logs
            Console.WriteLine($"[MeetingHub] Tick error: {ex}");
            throw; // SignalR will send "error on the server" to the client
        }
    }
    
    
}
