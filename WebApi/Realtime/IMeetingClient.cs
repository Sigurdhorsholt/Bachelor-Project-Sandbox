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
        // (optional) admin-only events
        Task AdminNotice(AdminNoticeDto dto);
    }
    
    // Tiny DTOs for clarity & evolvability
    public record MeetingStateChangedDto(string MeetingId, int State);
    public record MeetingStartedDto(string MeetingId);
    public record AdminNoticeDto(string MeetingId, string Message, DateTime AtUtc);
}

