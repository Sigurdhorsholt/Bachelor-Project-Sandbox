using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Application.Persistence;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Infrastructure;

public static class DatabaseHealthCheckExtensions
{
    /// <summary>
    /// Verifies database connectivity on application startup. Fails fast if connection cannot be established.
    /// </summary>
    public static async Task<IApplicationBuilder> UseDatabaseHealthCheck(this IApplicationBuilder app)
    {
        using (var scope = app.ApplicationServices.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            
            try
            {
                await db.Database.OpenConnectionAsync();
                await db.Database.CloseConnectionAsync();
                logger.LogInformation("Application started successfully. Database connection verified.");
            }
            catch (Exception ex)
            {
                logger.LogCritical(ex, "Failed to connect to database. Application cannot start.");
                throw;
            }
        }

        return app;
    }
}