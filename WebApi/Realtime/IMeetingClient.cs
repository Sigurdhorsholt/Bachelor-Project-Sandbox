using System.Threading.Tasks;

namespace WebApi.Realtime
{
    // Client methods that the server can invoke
    public interface IMeetingClient
    {
        Task ShowConnectedIndicator(bool show);
        Task Connected(object connectionInfo);
        Task TickAck(object tickInfo);
        
        // Observer events:
        Task MeetingStateChanged(MeetingStateChangedDto dto);
        Task MeetingStarted(MeetingStartedDto dto);
        Task MeetingStopped(MeetingStoppedDto dto);

        // (optional) admin-only events
        Task AdminNotice(AdminNoticeDto dto);
        
        Task PropositionVoteOpened(PropositionOpenedDto dto);
        Task PropositionVoteStopped(VotationStoppedDto dto);
        
        Task VoteCast(VoteCastDto dto);
        Task VoteChanged(VoteChangedDto dto);

        // Presence events (added for explicit presence contract)
        Task ParticipantCountUpdated(ParticipantCountDto dto);
        Task ParticipantJoined(ParticipantJoinedDto dto);
        Task ParticipantLeft(ParticipantLeftDto dto);
    }
    
    // Tiny DTOs for clarity & evolvability
    public record MeetingStateChangedDto(string MeetingId, int State);
    public record MeetingStartedDto(string MeetingId);
    public record MeetingStoppedDto(string MeetingId);

    public record AdminNoticeDto(string MeetingId, string Message, DateTime AtUtc);
    
    
    public record PropositionOpenedDto(string MeetingId, string PropositionId, string VotationId);
    public record VotationStoppedDto(string MeetingId, string PropositionId, string VotationId, DateTime StoppedAtUtc);
    
    public record VoteCastDto(string MeetingId, string PropositionId, string VotationId);
    public record VoteChangedDto(string MeetingId, string PropositionId, string VotationId);

    // Presence DTOs
    public record ParticipantCountDto(string MeetingId, int Count);
    public record ParticipantJoinedDto(string MeetingId, string ConnectionId, string? Summary);
    public record ParticipantLeftDto(string MeetingId, string ConnectionId, string? Summary);

