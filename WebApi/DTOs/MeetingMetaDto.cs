namespace WebApi.DTOs
{
    public class MeetingMetaDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = "";
        public DateTime StartsAtUtc { get; set; }
        public string Status { get; set; } = "";
        public string MeetingCode { get; set; } = "";
        public int Started { get; set; }
    }
}

