using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace WebApi.Realtime;

// Client methods the server will call
public interface IPresenceClient
{
    Task UserJoined(UserDto user);
    Task UserLeft(string connectionId);
    Task CurrentUsers(UserDto[] users);
}

// Simple user DTO
public record UserDto(string ConnectionId, string Name);

// Presence Hub
public class PresenceHub : Hub<IPresenceClient>
{
    // connectionId -> name
    private static readonly ConcurrentDictionary<string, string> _users = new();

    public override async Task OnDisconnectedAsync(Exception? ex)
    {
        if (_users.TryRemove(Context.ConnectionId, out _))
            await Clients.All.UserLeft(Context.ConnectionId);

        await base.OnDisconnectedAsync(ex);
    }

    // Client calls this right after connecting
    public async Task Join(string name)
    {
        _users[Context.ConnectionId] = name;

        // tell the new client who is already here
        var snapshot = _users.Select(kvp => new UserDto(kvp.Key, kvp.Value)).ToArray();
        await Clients.Caller.CurrentUsers(snapshot);

        // notify everyone
        await Clients.All.UserJoined(new UserDto(Context.ConnectionId, name));
    }

    public async Task Leave()
    {
        if (_users.TryRemove(Context.ConnectionId, out _))
            await Clients.All.UserLeft(Context.ConnectionId);

        // Optionally close the connection from server side
        Context.Abort();
    }
}