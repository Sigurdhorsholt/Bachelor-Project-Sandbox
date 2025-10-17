using Application.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace WebApi.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config)
    {
        var cs = config.GetConnectionString("Default")
                 ?? "Host=localhost;Database=bachelordb;Username=postgres;Password=postgres;SSL Mode=Require;Trust Server Certificate=true";

        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(cs)
                .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

        // Optional: smooth DateTime behavior in older code paths
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        return services;
    }
}