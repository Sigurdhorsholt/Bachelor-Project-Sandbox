// filepath: c:\Users\sigur\Documents\GitHub\Bachelor-Project-Sandbox\WebApi\Services\IMeetingCodeService.cs
using System.Threading;
using System.Threading.Tasks;
using WebApi.DTOs;

namespace WebApi.Services;

public interface IMeetingCodeService
{
    /// <summary>
    /// Generate a new unique meeting code and ensure it does not already exist in the database.
    /// </summary>
    /// <param name="cancellationToken"></param>
    /// <returns>A short, human-friendly meeting code.</returns>
    Task<string> GenerateUniqueCodeAsync(CancellationToken cancellationToken = default);
}
