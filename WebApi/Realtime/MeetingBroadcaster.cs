// WebApi/Realtime/MeetingBroadcaster.cs
using Microsoft.AspNetCore.SignalR;

namespace WebApi.Realtime;

public interface IMeetingBroadcaster
{
    Task MeetingStateChanged(string meetingId, int newState);
    Task MeetingStarted(string meetingId);
    Task MeetingStopped(string meetingId);

    Task AdminNotice(string meetingId, string message);
    
    Task MeetingPropositionOpened(string meetingId, string propositionId, string votationId);
    Task MeetingVotationStopped(string meetingId, string propositionId, string votationId, DateTime stoppedAtUtc);

}

public class MeetingBroadcaster : IMeetingBroadcaster
{
    private readonly IHubContext<MeetingHub, IMeetingClient> _hub;
    private readonly ILogger<MeetingBroadcaster> _logger;

    public MeetingBroadcaster(IHubContext<MeetingHub, IMeetingClient> hub, ILogger<MeetingBroadcaster> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public Task MeetingStateChanged(string meetingId, int newState)
    {
        var dto = new MeetingStateChangedDto(meetingId, newState); 
        try
        {
            _logger.LogInformation("Broadcasting MeetingStateChanged for meeting {MeetingId} state={State}", meetingId, newState);
            var tasks = new [] {
                _hub.Clients.Group(MeetingHub.MeetingGroup(meetingId)).MeetingStateChanged(dto),
                _hub.Clients.Group(MeetingHub.AdminsGroup).MeetingStateChanged(dto)
            };
            return Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting MeetingStateChanged for meeting {MeetingId}", meetingId);
            throw;
        }
    }

    public Task MeetingStarted(string meetingId)
    {
        var dto = new MeetingStartedDto(meetingId);
        try
        {
            _logger.LogInformation("Broadcasting MeetingStarted for meeting {MeetingId}", meetingId);
            var tasks = new [] {
                _hub.Clients.Group(MeetingHub.MeetingGroup(meetingId)).MeetingStarted(dto),
                _hub.Clients.Group(MeetingHub.AdminsGroup).MeetingStarted(dto)
            };
            return Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting MeetingStarted for meeting {MeetingId}", meetingId);
            throw;
        }
    }
    
    public Task MeetingStopped(string meetingId)
    {
        var dto = new MeetingStoppedDto(meetingId);
        try
        {
            _logger.LogInformation("Broadcasting MeetingStopped for meeting {MeetingId}", meetingId);
            var tasks = new [] {
                _hub.Clients.Group(MeetingHub.MeetingGroup(meetingId)).MeetingStopped(dto),
                _hub.Clients.Group(MeetingHub.AdminsGroup).MeetingStopped(dto)
            };
            return Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting MeetingStopped for meeting {MeetingId}", meetingId);
            throw;
        }
    }

    public Task AdminNotice(string meetingId, string message)
        => _hub.Clients.Group(MeetingHub.AdminsGroup)
            .AdminNotice(new AdminNoticeDto(meetingId, message, DateTime.UtcNow));
    
    
    public Task MeetingPropositionOpened(string meetingId, string propositionId, string votationId)
    {
        var dto = new PropositionOpenedDto(meetingId, propositionId, votationId);
        _logger.LogInformation("Broadcasting PropositionOpened {MeetingId} prop={Prop} votation={Votation}",
            meetingId, propositionId, votationId);

        return Task.WhenAll(
            _hub.Clients.Group(MeetingHub.MeetingGroup(meetingId)).PropositionVoteOpened(dto),
            _hub.Clients.Group(MeetingHub.AdminsGroup).PropositionVoteOpened(dto)
        );
    }
    
    public Task MeetingVotationStopped(string meetingId, string propositionId, string votationId, DateTime stoppedAtUtc)
    {
        var dto = new VotationStoppedDto(meetingId, propositionId, votationId, stoppedAtUtc);
        _logger.LogInformation("Broadcasting VotationStopped {MeetingId} prop={Prop} votation={Votation}",
            meetingId, propositionId, votationId);

        return Task.WhenAll(
            _hub.Clients.Group(MeetingHub.MeetingGroup(meetingId)).PropositionVoteStopped(dto),
            _hub.Clients.Group(MeetingHub.AdminsGroup).PropositionVoteStopped(dto)
        );
    }
}