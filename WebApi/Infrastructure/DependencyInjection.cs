using Application.Persistence;

namespace WebApi.Infrastructure;

using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config)
    {
        var cs = config.GetConnectionString("Default")
                 ?? "Data Source=identifier.sqlite;Cache=Shared;Foreign Keys=True";

        // No need for a singleton connection; let EF manage them normally.
        services.AddDbContext<AppDbContext>(opt =>
            opt.UseSqlite(cs)
                .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

        return services;
    }
}