namespace Application.Services;

/// <summary>
/// Service interface for voting operations including casting votes, managing votations, and retrieving results
/// </summary>
public interface IVotingService
{
    /// <summary>
    /// Cast a vote using an admission ticket code
    /// </summary>
    Task<CastVoteResult> CastVoteAsync(Guid meetingId, Guid propositionId, Guid voteOptionId, string code);
    
    /// <summary>
    /// Get vote results for a votation
    /// </summary>
    Task<VotationResultsDto> GetVotationResultsAsync(Guid votationId);
    
    /// <summary>
    /// Check if an admission ticket has voted in a specific votation
    /// </summary>
    Task<VoteCheckResult> CheckIfVotedAsync(string code, Guid votationId);
    
    /// <summary>
    /// Get all votes for a meeting
    /// </summary>
    Task<List<VoteDetailsDto>> GetAllVotesForMeetingAsync(Guid meetingId);
    
    /// <summary>
    /// Revoke/delete a vote
    /// </summary>
    Task RevokeVoteAsync(Guid ballotId);
    
    /// <summary>
    /// Start a votation for a proposition in a meeting
    /// </summary>
    Task<VotationStartResult> StartVotationAsync(Guid meetingId, Guid propositionId);
    
    /// <summary>
    /// Stop an open votation for a proposition
    /// </summary>
    Task<VotationStopResult> StopVotationAsync(Guid propositionId);
    
    /// <summary>
    /// Get a votation by ID
    /// </summary>
    Task<VotationDto?> GetVotationAsync(Guid votationId);
    
    /// <summary>
    /// Get all open votations for a meeting
    /// </summary>
    Task<List<VotationDto>> GetOpenVotationsForMeetingAsync(Guid meetingId);
    
    /// <summary>
    /// Get all votations for a specific proposition in a meeting
    /// </summary>
    Task<List<VotationDto>> GetVotationsByPropositionAsync(Guid meetingId, Guid propositionId);
    
    /// <summary>
    /// Start a re-vote for a proposition (closes existing votations and marks them as overwritten)
    /// </summary>
    Task<RevoteResult> StartRevoteAsync(Guid propositionId);
    
    /// <summary>
    /// Add manual ballots for paper votes cast physically during a meeting
    /// </summary>
    Task<ManualBallotResult> AddManualBallotsAsync(Guid votationId, Dictionary<Guid, int> optionCounts, string? notes);
}

public class CastVoteResult
{
    public Guid BallotId { get; set; }
    public Guid? VoteId { get; set; }
    public Guid VotationId { get; set; }
    public string Action { get; set; } = null!; // "Created" or "Updated"
    public string? TestTicketCode { get; set; }
}

public class VotationResultsDto
{
    public Guid VotationId { get; set; }
    public Guid PropositionId { get; set; }
    public string Question { get; set; } = null!;
    public int TotalVotes { get; set; }
    public List<VoteOptionResultDto> Results { get; set; } = new();
    public bool Open { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}

public class VoteOptionResultDto
{
    public Guid VoteOptionId { get; set; }
    public string Label { get; set; } = null!;
    public int Count { get; set; }
}

public class VoteCheckResult
{
    public bool HasVoted { get; set; }
    public Guid VotationId { get; set; }
    public Guid? BallotId { get; set; }
    public Guid? VoteOptionId { get; set; }
    public string? VoteOptionLabel { get; set; }
    public DateTime? CastAt { get; set; }
}

public class VoteDetailsDto
{
    public Guid BallotId { get; set; }
    public Guid VotationId { get; set; }
    public Guid PropositionId { get; set; }
    public Guid VoteOptionId { get; set; }
    public string? VoteOptionLabel { get; set; }
    public DateTime CastAt { get; set; }
    public string? EventType { get; set; }
}

public class VotationStartResult
{
    public Guid VotationId { get; set; }
    public Guid MeetingId { get; set; }
    public Guid PropositionId { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public bool Open { get; set; }
}

public class VotationStopResult
{
    public Guid VotationId { get; set; }
    public Guid MeetingId { get; set; }
    public Guid PropositionId { get; set; }
    public DateTime EndedAtUtc { get; set; }
}

public class VotationDto
{
    public Guid Id { get; set; }
    public Guid MeetingId { get; set; }
    public Guid PropositionId { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? EndedAtUtc { get; set; }
    public bool Open { get; set; }
    public bool Overwritten { get; set; }
}

public class RevoteResult
{
    public Guid? LatestVotationId { get; set; }
    public Guid? MeetingId { get; set; }
    public Guid? PropositionId { get; set; }
    public DateTime? EndedAtUtc { get; set; }
    public int ClosedVotationsCount { get; set; }
}

public class ManualBallotResult
{
    public int TotalBallotsAdded { get; set; }
    public Guid VotationId { get; set; }
    public DateTime RecordedAtUtc { get; set; }
    public Dictionary<Guid, int> CountsByOption { get; set; } = new();
}
