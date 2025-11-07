// WebApi/Realtime/MeetingHub.cs
using System.Security.Claims;
using Application.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace WebApi.Realtime;


//TODO: ADD AUTHORIZATION WHEN IT WORKS
public class MeetingHub : Hub<IMeetingClient>
{
    private readonly ILogger<MeetingHub> _logger;
    private readonly AppDbContext _dbContext;

    public MeetingHub(ILogger<MeetingHub> logger, AppDbContext dbContext)
    {
        _logger = logger;
        _dbContext = dbContext;
    }

    public record TickDto(DateTime At, int N);

    public const string AdminsGroup = "admins";
    public static string MeetingGroup(string meetingId) => $"meeting:{meetingId}";

    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.Connected(new { id = Context.ConnectionId, at = DateTime.UtcNow });

        // if the user is admin, auto-join admins group
        if (Context.User?.IsInRole("Admin") == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroup);
            _logger.LogInformation("SignalR admin added to AdminsGroup: {ConnectionId}, {Context.User}", Context.ConnectionId);
        }
        _logger.LogInformation("SignalR connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("SignalR disconnected: {ConnectionId}. Error: {Error}",
            Context.ConnectionId, exception?.Message ?? "(none)");
        await base.OnDisconnectedAsync(exception);
    }

    // Subscription API (Observer attach/detach)
    public Task JoinMeeting(string meetingId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, MeetingGroup(meetingId));
    }
    
    public Task LeaveMeeting(string meetingId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, MeetingGroup(meetingId));
    }
    
    
    
    
    
    /// Simple round-trip test
    public async Task<string> Tick(TickDto dto)
    {
        try
        {
            _logger.LogInformation("SignalR tick from {ConnectionId} n={N}", Context.ConnectionId, dto.N);
            await Clients.Caller.TickAck(new { received = dto, conn = Context.ConnectionId });
            return $"ok:{dto.N}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MeetingHub] Tick error");
            throw;
        }
    }
}
