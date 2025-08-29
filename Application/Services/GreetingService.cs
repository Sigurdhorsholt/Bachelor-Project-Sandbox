using Application.Abstractions;

namespace Application.Services;

public sealed class GreetingService : IGreetingService
{
    public string GetGreeting(string name) =>
        $"Hello {name}, the time is {DateTimeOffset.UtcNow:O}";
}