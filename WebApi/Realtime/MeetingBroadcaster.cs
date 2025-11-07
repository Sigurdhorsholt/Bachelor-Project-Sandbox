// WebApi/Realtime/MeetingBroadcaster.cs
using Microsoft.AspNetCore.SignalR;

namespace WebApi.Realtime;

public interface IMeetingBroadcaster
{
    Task MeetingStateChanged(string meetingId, int newState);
    Task MeetingStarted(string meetingId);
    Task AdminNotice(string meetingId, string message);
}

public class MeetingBroadcaster : IMeetingBroadcaster
{
    private readonly IHubContext<MeetingHub, IMeetingClient> _hub;

    public MeetingBroadcaster(IHubContext<MeetingHub, IMeetingClient> hub)
        => _hub = hub;

    public Task MeetingStateChanged(string meetingId, int newState)
        => _hub.Clients.Group(MeetingHub.MeetingGroup(meetingId))
            .MeetingStateChanged(new MeetingStateChangedDto(meetingId, newState));

    public Task MeetingStarted(string meetingId)
        => _hub.Clients.Group(MeetingHub.MeetingGroup(meetingId))
            .MeetingStarted(new MeetingStartedDto(meetingId));

    public Task AdminNotice(string meetingId, string message)
        => _hub.Clients.Group(MeetingHub.AdminsGroup)
            .AdminNotice(new AdminNoticeDto(meetingId, message, DateTime.UtcNow));
}