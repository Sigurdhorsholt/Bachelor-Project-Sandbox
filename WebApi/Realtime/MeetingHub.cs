// WebApi/Realtime/MeetingHub.cs
using System.Security.Claims;
using Application.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace WebApi.Realtime;


//TODO: ADD AUTHORIZATION WHEN IT WORKS
public class MeetingHub : Hub<IMeetingClient>
{
    private readonly ILogger<MeetingHub> _logger;
    private readonly AppDbContext _dbContext;

    // In-memory presence tracking:
    // meetingId -> (connectionId -> userName)
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string?>> _meetingParticipants = new();
    // connectionId -> (meetingId -> byte) — used to find meetings for a disconnected connection
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> _connectionMeetings = new();

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

        // Remove connection from any meetings it was part of and notify groups
        var connectionId = Context.ConnectionId;
        var userName = Context.User?.Identity?.Name ?? "<anonymous>";

        if (_connectionMeetings.TryRemove(connectionId, out var connMeetings))
        {
            foreach (var kv in connMeetings)
            {
                var meetingId = kv.Key;
                if (_meetingParticipants.TryGetValue(meetingId, out var participants))
                {
                    participants.TryRemove(connectionId, out _);
                    var count = participants.Count;

                    try
                    {
                        var dto = new ParticipantLeftDto(meetingId, connectionId, userName, count);
                        // notify admins and meeting group participants
                        await Clients.Group(AdminsGroup).ParticipantLeft(dto);
                        await Clients.Group(MeetingGroup(meetingId)).ParticipantLeft(dto);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error broadcasting ParticipantLeft for meeting {MeetingId} on disconnect", meetingId);
                    }

                    if (participants.IsEmpty)
                    {
                        _meetingParticipants.TryRemove(meetingId, out _);
                    }
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    // Subscription API (Observer attach/detach)
    public async Task JoinMeeting(string meetingId)
    {
        try
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, MeetingGroup(meetingId));
            var userName = Context.User?.Identity?.Name ?? "<anonymous>";
            var isAdmin = Context.User?.IsInRole("Admin") == true;
            _logger.LogInformation("SignalR connection {ConnectionId} (User={User}) joined group {Group} (IsAdmin={IsAdmin})",
                Context.ConnectionId, userName, MeetingGroup(meetingId), isAdmin);

            // Track presence
            var participants = _meetingParticipants.GetOrAdd(meetingId, _ => new ConcurrentDictionary<string, string?>());
            participants[Context.ConnectionId] = userName;
            var connMeetings = _connectionMeetings.GetOrAdd(Context.ConnectionId, _ => new ConcurrentDictionary<string, byte>());
            connMeetings.TryAdd(meetingId, 0);

            var count = participants.Count;

            // Notify admins (and optionally meeting participants) that a participant joined
            try
            {
                var dto = new ParticipantJoinedDto(meetingId, Context.ConnectionId, userName, count);
                // notify admins
                await Clients.Group(AdminsGroup).ParticipantJoined(dto);
                // also notify meeting group participants (optional)
                await Clients.Group(MeetingGroup(meetingId)).ParticipantJoined(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error broadcasting ParticipantJoined for meeting {MeetingId}", meetingId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding connection {ConnectionId} to group {Group}", Context.ConnectionId, MeetingGroup(meetingId));
            throw;
        }
    }
    
    public async Task LeaveMeeting(string meetingId)
    {
        try
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, MeetingGroup(meetingId));
            var userName = Context.User?.Identity?.Name ?? "<anonymous>";
            var isAdmin = Context.User?.IsInRole("Admin") == true;
            _logger.LogInformation("SignalR connection {ConnectionId} (User={User}) left group {Group} (IsAdmin={IsAdmin})",
                Context.ConnectionId, userName, MeetingGroup(meetingId), isAdmin);

            // Update presence tracking
            int count = 0;
            if (_meetingParticipants.TryGetValue(meetingId, out var participants))
            {
                participants.TryRemove(Context.ConnectionId, out _);
                count = participants.Count;
                if (participants.IsEmpty)
                {
                    _meetingParticipants.TryRemove(meetingId, out _);
                }
            }
            if (_connectionMeetings.TryGetValue(Context.ConnectionId, out var connMeetings))
            {
                connMeetings.TryRemove(meetingId, out _);
                if (connMeetings.IsEmpty)
                {
                    _connectionMeetings.TryRemove(Context.ConnectionId, out _);
                }
            }

            // Notify admins (and optionally meeting participants) that a participant left
            try
            {
                var dto = new ParticipantLeftDto(meetingId, Context.ConnectionId, userName, count);
                // notify admins
                await Clients.Group(AdminsGroup).ParticipantLeft(dto);
                // also notify meeting group participants (optional)
                await Clients.Group(MeetingGroup(meetingId)).ParticipantLeft(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error broadcasting ParticipantLeft for meeting {MeetingId}", meetingId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing connection {ConnectionId} from group {Group}", Context.ConnectionId, MeetingGroup(meetingId));
            throw;
        }
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
