using Application.Domain.Entities;
using Application.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Services;

/// <summary>
/// Service for voting operations including casting votes, managing votations, and retrieving results
/// </summary>
public class VotingService : IVotingService
{
    private readonly AppDbContext _db;
    private readonly ILogger<VotingService> _logger;

    public VotingService(AppDbContext db, ILogger<VotingService> logger)
    {
        _db = db;
        _logger = logger;
    }

    #region Public Methods

    public async Task<CastVoteResult> CastVoteAsync(Guid meetingId, Guid propositionId, Guid voteOptionId, string code)
    {
        // Resolve admission ticket (handle test codes and real codes)
        var (ticketEntity, isTestRequest, generatedTestTicketCode) = 
            await ResolveAdmissionTicketAsync(code, meetingId);

        // Validate votation exists and is open
        var votation = await ValidateVotationAsync(meetingId, propositionId);

        // Validate vote option belongs to proposition
        await ValidateVoteOptionAsync(voteOptionId, propositionId);

        // Check if ticket has already voted in this votation
        var existingBallot = await FindExistingBallotAsync(ticketEntity.Id, votation.Id, isTestRequest);

        // Cast or update the vote
        if (existingBallot != null)
        {
            return await UpdateExistingVoteAsync(existingBallot, voteOptionId, ticketEntity, votation, isTestRequest);
        }
        else
        {
            return await CreateNewVoteAsync(ticketEntity, votation, voteOptionId, isTestRequest, generatedTestTicketCode);
        }
    }

    public async Task<VotationResultsDto> GetVotationResultsAsync(Guid votationId)
    {
        // Load votation with proposition and options
        var (votation, proposition) = await LoadVotationWithPropositionAsync(votationId);

        // Get all ballots for this votation
        var ballots = await GetBallotsForVotationAsync(votationId);

        // Calculate results for each option
        var results = CalculateVoteResults(proposition.Options, ballots);

        // Build and return results DTO
        return BuildVotationResultsDto(votation, proposition, ballots, results);
    }

    public async Task<VoteCheckResult> CheckIfVotedAsync(string code, Guid votationId)
    {
        // Resolve ticket (test or real)
        var ticket = await ResolveTicketForCheckAsync(code, votationId);

        // Find existing ballot for this ticket and votation
        var ballot = await FindBallotForTicketAsync(ticket.Id, votationId);

        // Build and return check result
        return BuildVoteCheckResult(ballot, votationId);
    }

    public async Task<List<VoteDetailsDto>> GetAllVotesForMeetingAsync(Guid meetingId)
    {
        // Validate meeting exists
        await ValidateMeetingExistsAsync(meetingId);

        // Load and map all votes for the meeting
        var votes = await LoadVotesForMeetingAsync(meetingId);

        return votes;
    }

    public async Task RevokeVoteAsync(Guid ballotId)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        try
        {
            // Load ballot with all necessary includes
            var ballot = await LoadBallotForRevocationAsync(ballotId);

            // Validate ballot can be revoked
            ValidateBallotCanBeRevoked(ballot);

            // Perform revocation
            await PerformBallotRevocationAsync(ballot);

            await tx.CommitAsync();

            _logger.LogInformation("Vote revoked for ballot {BallotId}", ballotId);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Error revoking vote for ballot {BallotId}", ballotId);
            throw;
        }
    }

    public async Task<VotationStartResult> StartVotationAsync(Guid meetingId, Guid propositionId)
    {
        // Validate meeting and proposition exist
        await ValidateMeetingAndPropositionAsync(meetingId, propositionId);

        await using var tx = await _db.Database.BeginTransactionAsync();

        try
        {
            // Check and prevent duplicate open votations
            await EnsureNoOpenVotationExistsAsync(meetingId, propositionId);

            // Mark any existing votations as overwritten
            await MarkExistingVotationsAsOverwrittenIfNeededAsync(meetingId, propositionId);

            // Create and save new votation
            var votation = await CreateAndSaveVotationAsync(meetingId, propositionId);

            await tx.CommitAsync();

            _logger.LogInformation(
                "[VotationStarted] VotationId={VotationId} MeetingId={MeetingId} PropositionId={PropositionId}",
                votation.Id, meetingId, propositionId);

            return BuildVotationStartResult(votation);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Error starting votation for meeting {MeetingId}, proposition {PropositionId}",
                meetingId, propositionId);
            throw;
        }
    }

    public async Task<VotationStopResult> StopVotationAsync(Guid propositionId)
    {
        // Find the latest open votation
        var votation = await FindLatestOpenVotationAsync(propositionId);

        // Close the votation
        CloseVotation(votation);

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "[VotationStopped] VotationId={VotationId} PropositionId={PropositionId} EndedAt={EndedAt}",
            votation.Id, propositionId, votation.EndedAtUtc);

        return BuildVotationStopResult(votation);
    }

    public async Task<VotationDto?> GetVotationAsync(Guid votationId)
    {
        var votation = await _db.Votations.FindAsync(votationId);
        
        if (votation == null)
        {
            return null;
        }

        return MapToVotationDto(votation);
    }

    public async Task<List<VotationDto>> GetOpenVotationsForMeetingAsync(Guid meetingId)
    {
        var meeting = await _db.Meetings.FindAsync(meetingId);
        if (meeting == null)
        {
            throw new InvalidOperationException("Meeting not found.");
        }

        var openVotations = await _db.Votations
            .Where(v => v.MeetingId == meetingId && v.Open)
            .ToListAsync();

        return openVotations.Select(MapToVotationDto).ToList();
    }

    public async Task<List<VotationDto>> GetVotationsByPropositionAsync(Guid meetingId, Guid propositionId)
    {
        // Validate meeting and proposition exist
        await ValidateMeetingAndPropositionAsync(meetingId, propositionId);

        var votations = await _db.Votations
            .Where(v => v.MeetingId == meetingId && v.PropositionId == propositionId)
            .OrderByDescending(v => v.StartedAtUtc)
            .ToListAsync();

        return votations.Select(MapToVotationDto).ToList();
    }

    public async Task<RevoteResult> StartRevoteAsync(Guid propositionId)
    {
        // Find the latest votation for tracking
        var latest = await FindLatestVotationAsync(propositionId);

        // Close all open votations for this proposition
        var closedCount = await CloseOpenVotationsForPropositionAsync(propositionId);

        _logger.LogInformation(
            "[Revote] PropositionId={PropositionId} ClosedVotations={Count}",
            propositionId, closedCount);

        return BuildRevoteResult(latest, propositionId, closedCount);
    }

    public async Task<ManualBallotResult> AddManualBallotsAsync(Guid votationId, Dictionary<Guid, int> optionCounts, string? notes)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        try
        {
            // Validate votation exists and is open
            var votation = await ValidateVotationForManualBallotsAsync(votationId);

            // Validate all vote options belong to this votation's proposition
            await ValidateVoteOptionsForVotationAsync(votation.PropositionId, optionCounts.Keys.ToList());

            // Validate all counts are positive
            ValidateOptionCounts(optionCounts);

            var recordedAtUtc = DateTime.UtcNow;
            var totalAdded = 0;
            var countsByOption = new Dictionary<Guid, int>();

            // Create ballots for each option and count
            foreach (var (optionId, count) in optionCounts)
            {
                if (count <= 0) continue;

                for (int i = 0; i < count; i++)
                {
                    await CreateManualBallotAsync(votation.Id, optionId, recordedAtUtc);
                    totalAdded++;
                }

                countsByOption[optionId] = count;
            }

            // Create audit event for manual ballot addition
            if (totalAdded > 0)
            {
                await CreateManualBallotAuditEventAsync(votation, countsByOption, totalAdded, notes, recordedAtUtc);
            }

            await tx.CommitAsync();

            _logger.LogInformation(
                "[ManualBallotsAdded] VotationId={VotationId} TotalAdded={Count} Notes={Notes}",
                votationId, totalAdded, notes ?? "None");

            return new ManualBallotResult
            {
                TotalBallotsAdded = totalAdded,
                VotationId = votationId,
                RecordedAtUtc = recordedAtUtc,
                CountsByOption = countsByOption
            };
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Error adding manual ballots for votation {VotationId}", votationId);
            throw;
        }
    }

    #endregion

    #region Helper Methods - Admission Ticket Resolution

    private async Task<(AdmissionTicket ticket, bool isTestRequest, string? generatedTestCode)> 
        ResolveAdmissionTicketAsync(string code, Guid meetingId)
    {
        var isTestRequest = code == "TESTCODE";
        string? generatedTestTicketCode = null;

        if (isTestRequest)
        {
            generatedTestTicketCode = $"TESTCODE-{Guid.NewGuid():N}";
            var ticketEntity = new AdmissionTicket
            {
                Id = Guid.NewGuid(),
                MeetingId = meetingId,
                Code = generatedTestTicketCode,
                Used = false
            };

            _logger.LogInformation(
                "[TestTicket] Generated ephemeral ticket {TicketCode} (Id: {TicketId}) for meeting {MeetingId}",
                generatedTestTicketCode, ticketEntity.Id, meetingId);

            return (ticketEntity, true, generatedTestTicketCode);
        }
        else
        {
            var dbTicket = await _db.AdmissionTickets
                .Include(t => t.Meeting)
                .FirstOrDefaultAsync(t => t.Code == code);

            if (dbTicket == null)
            {
                throw new InvalidOperationException("Invalid admission ticket code.");
            }

            if (dbTicket.MeetingId != meetingId)
            {
                throw new InvalidOperationException("This admission ticket does not belong to the specified meeting.");
            }

            return (dbTicket, false, null);
        }
    }

    private async Task<AdmissionTicket> CreateEphemeralTestTicketAsync(Guid votationId)
    {
        var votation = await _db.Votations.FirstOrDefaultAsync(v => v.Id == votationId);
        if (votation == null)
        {
            throw new InvalidOperationException("Votation not found.");
        }

        var generatedCode = $"TESTCODE-{Guid.NewGuid():N}";
        var ticket = new AdmissionTicket
        {
            Id = Guid.NewGuid(),
            MeetingId = votation.MeetingId,
            Code = generatedCode,
            Used = false
        };

        _db.AdmissionTickets.Add(ticket);
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "[CheckIfVoted][TestTicket] Persisted ephemeral test ticket {TicketCode} (Id: {TicketId}) for meeting {MeetingId}",
            generatedCode, ticket.Id, votation.MeetingId);

        return ticket;
    }

    #endregion

    #region Helper Methods - Validation

    private async Task<Votation> ValidateVotationAsync(Guid meetingId, Guid propositionId)
    {
        var votation = await _db.Votations
            .Include(v => v.Proposition)
            .FirstOrDefaultAsync(v =>
                v.MeetingId == meetingId &&
                v.PropositionId == propositionId &&
                v.Open);

        if (votation == null)
        {
            throw new InvalidOperationException("No open votation found for this proposition.");
        }

        return votation;
    }

    private async Task ValidateVoteOptionAsync(Guid voteOptionId, Guid propositionId)
    {
        var voteOption = await _db.VoteOptions
            .FirstOrDefaultAsync(vo =>
                vo.Id == voteOptionId &&
                vo.PropositionId == propositionId);

        if (voteOption == null)
        {
            throw new InvalidOperationException("Invalid vote option for this proposition.");
        }
    }

    private async Task<Ballot?> FindExistingBallotAsync(Guid ticketId, Guid votationId, bool isTestRequest)
    {
        if (isTestRequest)
        {
            // Test requests always create new ballots
            return null;
        }

        return await _db.Ballots
            .Include(b => b.Vote)
                .ThenInclude(v => v.AuditableEvent)
            .FirstOrDefaultAsync(b =>
                b.AdmissionTicketId == ticketId &&
                b.VotationId == votationId);
    }

    private async Task ValidateMeetingAndPropositionAsync(Guid meetingId, Guid propositionId)
    {
        var meeting = await _db.Meetings.FindAsync(meetingId);
        if (meeting == null)
        {
            throw new InvalidOperationException("Meeting not found.");
        }

        var proposition = await _db.Propositions.FindAsync(propositionId);
        if (proposition == null)
        {
            throw new InvalidOperationException("Proposition not found.");
        }
    }

    private async Task ValidateMeetingExistsAsync(Guid meetingId)
    {
        var meeting = await _db.Meetings.FindAsync(meetingId);
        if (meeting == null)
        {
            throw new InvalidOperationException("Meeting not found.");
        }
    }

    private void ValidateBallotCanBeRevoked(Ballot ballot)
    {
        if (!ballot.Votation.Open)
        {
            throw new InvalidOperationException("Cannot revoke vote from a closed votation.");
        }
    }

    private async Task EnsureNoOpenVotationExistsAsync(Guid meetingId, Guid propositionId)
    {
        var openVotationExists = await _db.Votations
            .AnyAsync(v => v.MeetingId == meetingId && v.PropositionId == propositionId && v.Open);

        if (openVotationExists)
        {
            throw new InvalidOperationException("An open votation for this proposition already exists in the meeting.");
        }
    }

    private async Task MarkExistingVotationsAsOverwrittenAsync(Guid meetingId, Guid propositionId)
    {
        var existingVotations = await _db.Votations
            .Where(v => v.MeetingId == meetingId && v.PropositionId == propositionId && v.Open)
            .ToListAsync();

        foreach (var votation in existingVotations)
        {
            votation.Overwritten = true;
            votation.Open = false;
            votation.EndedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "[VotationOverwrite] MeetingId={MeetingId} PropositionId={PropositionId} ClosedVotations={Count}",
            meetingId, propositionId, existingVotations.Count);
    }

    private async Task<Votation> ValidateVotationForManualBallotsAsync(Guid votationId)
    {
        var votation = await _db.Votations
            .Include(v => v.Proposition)
            .FirstOrDefaultAsync(v => v.Id == votationId);

        if (votation == null)
        {
            throw new InvalidOperationException("Votation not found.");
        }

        if (!votation.Open)
        {
            throw new InvalidOperationException("Cannot add manual ballots to a closed votation.");
        }

        return votation;
    }

    private async Task ValidateVoteOptionsForVotationAsync(Guid propositionId, List<Guid> optionIds)
    {
        var validOptions = await _db.VoteOptions
            .Where(vo => vo.PropositionId == propositionId)
            .Select(vo => vo.Id)
            .ToListAsync();

        var invalidOptions = optionIds.Where(id => !validOptions.Contains(id)).ToList();

        if (invalidOptions.Any())
        {
            throw new InvalidOperationException(
                $"The following vote option IDs do not belong to this proposition: {string.Join(", ", invalidOptions)}");
        }
    }

    private void ValidateOptionCounts(Dictionary<Guid, int> optionCounts)
    {
        var invalidCounts = optionCounts.Where(kvp => kvp.Value < 0).ToList();

        if (invalidCounts.Any())
        {
            throw new InvalidOperationException(
                $"Vote counts must be non-negative. Invalid counts for options: {string.Join(", ", invalidCounts.Select(kvp => kvp.Key))}");
        }
    }

    private async Task CreateManualBallotAsync(Guid votationId, Guid voteOptionId, DateTime recordedAtUtc)
    {
        // Get the votation to access the meeting ID
        var votation = await _db.Votations.FindAsync(votationId);
        if (votation == null)
        {
            throw new InvalidOperationException("Votation not found.");
        }

        // Create a placeholder admission ticket for the manual ballot
        var placeholderTicket = new AdmissionTicket
        {
            Id = Guid.NewGuid(),
            MeetingId = votation.MeetingId,
            Code = $"MANUAL-{Guid.NewGuid():N}",
            Used = true
        };

        _db.AdmissionTickets.Add(placeholderTicket);

        var ballot = new Ballot
        {
            Id = Guid.NewGuid(),
            AdmissionTicketId = placeholderTicket.Id,
            VotationId = votationId,
            VoteOptionId = voteOptionId,
            CastAtUtc = recordedAtUtc
        };

        _db.Ballots.Add(ballot);

        var vote = new Vote
        {
            Id = Guid.NewGuid(),
            BallotId = ballot.Id,
            CreatedAtUtc = recordedAtUtc
        };

        _db.Votes.Add(vote);

        var auditEvent = new AuditableEvent
        {
            Id = Guid.NewGuid(),
            VoteId = vote.Id,
            EventType = "ManualBallotAdded",
            Metadata = $"Manual ballot added for votation {votationId}",
            TimestampUtc = recordedAtUtc
        };

        _db.AuditableEvents.Add(auditEvent);

        await _db.SaveChangesAsync();
    }

    private async Task CreateManualBallotAuditEventAsync(
        Votation votation,
        Dictionary<Guid, int> countsByOption,
        int totalAdded,
        string? notes,
        DateTime recordedAtUtc)
    {
        var metadata = System.Text.Json.JsonSerializer.Serialize(new
        {
            TotalAdded = totalAdded,
            CountsByOption = countsByOption,
            Notes = notes,
            MeetingId = votation.MeetingId,
            PropositionId = votation.PropositionId,
            RecordedBy = "Admin"
        });

        _logger.LogInformation(
            "[ManualBallotAudit] VotationId={VotationId} Metadata={Metadata}",
            votation.Id, metadata);
    }

    #endregion

    #region Helper Methods - Data Loading

    private async Task<(Votation votation, Proposition proposition)> LoadVotationWithPropositionAsync(Guid votationId)
    {
        var votation = await _db.Votations
            .Include(v => v.Proposition!)
                .ThenInclude(p => p.Options)
            .FirstOrDefaultAsync(v => v.Id == votationId);

        if (votation == null)
        {
            throw new InvalidOperationException("Votation not found.");
        }

        var proposition = votation.Proposition;
        if (proposition == null)
        {
            throw new InvalidOperationException("Proposition not found for this votation.");
        }

        return (votation, proposition);
    }

    private async Task<List<Ballot>> GetBallotsForVotationAsync(Guid votationId)
    {
        return await _db.Ballots
            .Include(b => b.VoteOption)
            .Where(b => b.VotationId == votationId)
            .ToListAsync();
    }

    private async Task<AdmissionTicket> ResolveTicketForCheckAsync(string code, Guid votationId)
    {
        if (code == "TESTCODE")
        {
            return await CreateEphemeralTestTicketAsync(votationId);
        }

        var ticket = await _db.AdmissionTickets
            .FirstOrDefaultAsync(t => t.Code == code);

        if (ticket == null)
        {
            throw new InvalidOperationException("Invalid admission ticket code.");
        }

        return ticket;
    }

    private async Task<Ballot?> FindBallotForTicketAsync(Guid ticketId, Guid votationId)
    {
        return await _db.Ballots
            .Include(b => b.VoteOption)
            .FirstOrDefaultAsync(b =>
                b.AdmissionTicketId == ticketId &&
                b.VotationId == votationId);
    }

    private async Task<List<VoteDetailsDto>> LoadVotesForMeetingAsync(Guid meetingId)
    {
        return await _db.Ballots
            .Include(b => b.Votation)
            .Include(b => b.VoteOption)
            .Include(b => b.Vote)
                .ThenInclude(v => v.AuditableEvent)
            .Where(b => b.Votation.MeetingId == meetingId)
            .Select(b => new VoteDetailsDto
            {
                BallotId = b.Id,
                VotationId = b.VotationId,
                PropositionId = b.Votation.PropositionId,
                VoteOptionId = b.VoteOptionId,
                VoteOptionLabel = b.VoteOption.Label,
                CastAt = b.CastAtUtc,
                EventType = b.Vote.AuditableEvent != null ? b.Vote.AuditableEvent.EventType : null
            })
            .ToListAsync();
    }

    private async Task<Ballot> LoadBallotForRevocationAsync(Guid ballotId)
    {
        var ballot = await _db.Ballots
            .Include(b => b.Vote)
                .ThenInclude(v => v.AuditableEvent)
            .Include(b => b.Votation)
            .FirstOrDefaultAsync(b => b.Id == ballotId);

        if (ballot == null)
        {
            throw new InvalidOperationException("Ballot not found.");
        }

        return ballot;
    }

    private async Task<Votation> FindLatestOpenVotationAsync(Guid propositionId)
    {
        var votation = await _db.Votations
            .AsTracking()
            .Where(v => v.PropositionId == propositionId && v.Open)
            .OrderByDescending(v => v.StartedAtUtc)
            .FirstOrDefaultAsync();

        if (votation == null)
        {
            throw new InvalidOperationException("No open votation found for this proposition.");
        }

        return votation;
    }

    private async Task<Votation?> FindLatestVotationAsync(Guid propositionId)
    {
        return await _db.Votations
            .AsTracking()
            .Where(v => v.PropositionId == propositionId)
            .OrderByDescending(v => v.StartedAtUtc)
            .FirstOrDefaultAsync();
    }

    #endregion

    #region Helper Methods - Votation Operations

    private async Task MarkExistingVotationsAsOverwrittenIfNeededAsync(Guid meetingId, Guid propositionId)
    {
        var anyVotationExists = await _db.Votations
            .AnyAsync(v => v.MeetingId == meetingId && v.PropositionId == propositionId);

        if (anyVotationExists)
        {
            await MarkExistingVotationsAsOverwrittenAsync(meetingId, propositionId);
        }
    }

    private async Task<Votation> CreateAndSaveVotationAsync(Guid meetingId, Guid propositionId)
    {
        var votation = new Votation
        {
            Id = Guid.NewGuid(),
            MeetingId = meetingId,
            PropositionId = propositionId,
            StartedAtUtc = DateTime.UtcNow,
            Open = true,
            Overwritten = false
        };

        _db.Votations.Add(votation);
        await _db.SaveChangesAsync();

        return votation;
    }

    private void CloseVotation(Votation votation)
    {
        votation.Open = false;
        votation.EndedAtUtc = DateTime.UtcNow;
    }

    private async Task<int> CloseOpenVotationsForPropositionAsync(Guid propositionId)
    {
        var existingVotations = await _db.Votations
            .Where(v => v.PropositionId == propositionId && v.Open && !v.Overwritten)
            .ToListAsync();

        foreach (var v in existingVotations)
        {
            v.Overwritten = true;
            v.Open = false;
            v.EndedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        return existingVotations.Count;
    }

    private async Task PerformBallotRevocationAsync(Ballot ballot)
    {
        // Create revocation audit event before deleting
        CreateOrUpdateRevocationAuditEvent(ballot);
        await _db.SaveChangesAsync();

        // Delete cascade will handle Vote and AuditableEvents
        _db.Ballots.Remove(ballot);
        await _db.SaveChangesAsync();
    }

    #endregion

    #region Helper Methods - Result Building

    private List<VoteOptionResultDto> CalculateVoteResults(ICollection<VoteOption> options, List<Ballot> ballots)
    {
        return options.Select(opt => new VoteOptionResultDto
        {
            VoteOptionId = opt.Id,
            Label = opt.Label,
            Count = ballots.Count(b => b.VoteOptionId == opt.Id)
        }).ToList();
    }

    private VotationResultsDto BuildVotationResultsDto(
        Votation votation, 
        Proposition proposition, 
        List<Ballot> ballots, 
        List<VoteOptionResultDto> results)
    {
        return new VotationResultsDto
        {
            VotationId = votation.Id,
            PropositionId = votation.PropositionId,
            Question = proposition.Question,
            TotalVotes = ballots.Count,
            Results = results,
            Open = votation.Open,
            StartedAt = votation.StartedAtUtc,
            EndedAt = votation.EndedAtUtc
        };
    }

    private VoteCheckResult BuildVoteCheckResult(Ballot? ballot, Guid votationId)
    {
        if (ballot == null)
        {
            return new VoteCheckResult
            {
                HasVoted = false,
                VotationId = votationId
            };
        }

        return new VoteCheckResult
        {
            HasVoted = true,
            VotationId = votationId,
            BallotId = ballot.Id,
            VoteOptionId = ballot.VoteOptionId,
            VoteOptionLabel = ballot.VoteOption.Label,
            CastAt = ballot.CastAtUtc
        };
    }

    private VotationStartResult BuildVotationStartResult(Votation votation)
    {
        return new VotationStartResult
        {
            VotationId = votation.Id,
            MeetingId = votation.MeetingId,
            PropositionId = votation.PropositionId,
            StartedAtUtc = votation.StartedAtUtc,
            Open = votation.Open
        };
    }

    private VotationStopResult BuildVotationStopResult(Votation votation)
    {
        return new VotationStopResult
        {
            VotationId = votation.Id,
            MeetingId = votation.MeetingId,
            PropositionId = votation.PropositionId,
            EndedAtUtc = votation.EndedAtUtc!.Value
        };
    }

    private RevoteResult BuildRevoteResult(Votation? latest, Guid propositionId, int closedCount)
    {
        return new RevoteResult
        {
            LatestVotationId = latest?.Id,
            MeetingId = latest?.MeetingId,
            PropositionId = propositionId,
            EndedAtUtc = latest?.EndedAtUtc,
            ClosedVotationsCount = closedCount
        };
    }

    #endregion

    #region Helper Methods - Vote Creation and Update

    private async Task<CastVoteResult> CreateNewVoteAsync(
        AdmissionTicket ticketEntity, 
        Votation votation, 
        Guid voteOptionId, 
        bool isTestRequest, 
        string? generatedTestTicketCode)
    {
        await using var txCreate = await _db.Database.BeginTransactionAsync();

        // If this is a TEST request, persist the generated ticket
        if (isTestRequest)
        {
            _db.AdmissionTickets.Add(ticketEntity);
        }

        // Create ballot + vote (skip audit for test tickets)
        var skipAudit = isTestRequest;
        var (ballot, vote) = await CreateBallotAndVoteAsync(ticketEntity, votation, voteOptionId, skipAudit);

        await txCreate.CommitAsync();

        _logger.LogInformation(
            "[VoteCreated] TicketId={TicketId} VotationId={VotationId} BallotId={BallotId} VoteId={VoteId} Commit=Completed",
            ticketEntity.Id, votation.Id, ballot.Id, vote.Id);

        return new CastVoteResult
        {
            BallotId = ballot.Id,
            VoteId = vote.Id,
            VotationId = votation.Id,
            Action = "Created",
            TestTicketCode = isTestRequest ? generatedTestTicketCode : null
        };
    }

    private async Task<CastVoteResult> UpdateExistingVoteAsync(
        Ballot existingBallot, 
        Guid voteOptionId, 
        AdmissionTicket ticketEntity, 
        Votation votation, 
        bool isTestRequest)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();

        var oldOptionId = existingBallot.VoteOptionId;
        existingBallot.VoteOptionId = voteOptionId;
        existingBallot.CastAtUtc = DateTime.UtcNow;

        if (!isTestRequest)
        {
            CreateOrUpdateVoteChangedAuditEvent(existingBallot, oldOptionId, voteOptionId);
        }

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        _logger.LogInformation(
            "[VoteUpdated] TicketId={TicketId} VotationId={VotationId} OldOption={OldOption} NewOption={NewOption} Commit=Completed",
            ticketEntity.Id, votation.Id, oldOptionId, voteOptionId);

        return new CastVoteResult
        {
            BallotId = existingBallot.Id,
            VoteId = existingBallot.Vote?.Id,
            VotationId = votation.Id,
            Action = "Updated"
        };
    }

    private async Task<(Ballot ballot, Vote vote)> CreateBallotAndVoteAsync(
        AdmissionTicket ticket, 
        Votation votation, 
        Guid voteOptionId, 
        bool skipAudit)
    {
        var ballot = new Ballot
        {
            Id = Guid.NewGuid(),
            AdmissionTicketId = ticket.Id,
            VotationId = votation.Id,
            VoteOptionId = voteOptionId,
            CastAtUtc = DateTime.UtcNow
        };

        _db.Ballots.Add(ballot);

        var vote = new Vote
        {
            Id = Guid.NewGuid(),
            BallotId = ballot.Id,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Votes.Add(vote);

        if (!skipAudit)
        {
            var auditEvent = new AuditableEvent
            {
                Id = Guid.NewGuid(),
                VoteId = vote.Id,
                EventType = "VoteCast",
                Metadata = $"Vote cast on votation {votation.Id}",
                TimestampUtc = DateTime.UtcNow
            };

            _db.AuditableEvents.Add(auditEvent);
        }

        // Mark ticket as used
        if (!ticket.Used)
        {
            ticket.Used = true;
        }

        await _db.SaveChangesAsync();

        return (ballot, vote);
    }

    #endregion

    #region Helper Methods - Audit Events

    private void CreateOrUpdateVoteChangedAuditEvent(Ballot ballot, Guid oldOptionId, Guid newOptionId)
    {
        var existingEvent = ballot.Vote?.AuditableEvent;
        var metadata = $"Changed from option {oldOptionId} to {newOptionId}";

        if (existingEvent == null)
        {
            var changeEvent = new AuditableEvent
            {
                Id = Guid.NewGuid(),
                VoteId = ballot.Vote != null ? ballot.Vote.Id : Guid.Empty,
                EventType = "VoteChanged",
                Metadata = metadata,
                TimestampUtc = DateTime.UtcNow
            };

            _db.AuditableEvents.Add(changeEvent);
        }
        else
        {
            existingEvent.EventType = "VoteChanged";
            existingEvent.Metadata = metadata;
            existingEvent.TimestampUtc = DateTime.UtcNow;
            _db.AuditableEvents.Update(existingEvent);
        }
    }

    private void CreateOrUpdateRevocationAuditEvent(Ballot ballot)
    {
        var existingEvent = ballot.Vote?.AuditableEvent;
        var metadata = $"Vote revoked by admin at {DateTime.UtcNow}";

        if (existingEvent == null)
        {
            var revocationEvent = new AuditableEvent
            {
                Id = Guid.NewGuid(),
                VoteId = ballot.Vote.Id,
                EventType = "VoteRevoked",
                Metadata = metadata,
                TimestampUtc = DateTime.UtcNow
            };

            _db.AuditableEvents.Add(revocationEvent);
        }
        else
        {
            existingEvent.EventType = "VoteRevoked";
            existingEvent.Metadata = metadata;
            existingEvent.TimestampUtc = DateTime.UtcNow;
            _db.AuditableEvents.Update(existingEvent);
        }
    }

    #endregion

    #region Helper Methods - Mapping

    private static VotationDto MapToVotationDto(Votation votation)
    {
        return new VotationDto
        {
            Id = votation.Id,
            MeetingId = votation.MeetingId,
            PropositionId = votation.PropositionId,
            StartedAtUtc = votation.StartedAtUtc,
            EndedAtUtc = votation.EndedAtUtc,
            Open = votation.Open,
            Overwritten = votation.Overwritten
        };
    }

    #endregion
}
