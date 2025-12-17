using Application.Persistence;
using Application.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using System.Text.Json;

namespace WebApi.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config)
    {
        var cs = config.GetConnectionString("Default");
        if (cs == null)
        {
            throw new InvalidOperationException(
                "Database connection string 'ConnectionStrings:Default' is missing. " +
                "Please set the environment variable 'ConnectionStrings__Default' or add it to appsettings.json");
        }
        

        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(cs)
                .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

        // Optional: smooth DateTime behavior in older code paths
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        // Meeting code service (scoped so it can use the scoped DbContext)
        services.AddScoped<IMeetingCodeService, MeetingCodeService>();

        // Admission ticket service (generate/clear/replace verification codes)
        services.AddScoped<IAdmissionTicketService, AdmissionTicketService>();

        // JWT Authentication & Authorization
        services.AddAuthentication(config);
        services.AddAuthorizationPolicies();

        return services;
    }

    private static IServiceCollection AddAuthentication(
        this IServiceCollection services,
        IConfiguration config)
    {
        var jwtKey = config["Jwt:Key"];
        if (jwtKey == null)
        {
            throw new InvalidOperationException(
                "JWT Key 'Jwt:Key' is missing. " +
                "Please set the environment variable 'Jwt__Key' or add it to appsettings.json");
        }

        var jwtIssuer = config["Jwt:Issuer"];
        if (string.IsNullOrEmpty(jwtIssuer))
        {
            jwtIssuer = "fa-live-mvp";
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(jwtBearerOptions =>
            {
                jwtBearerOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = true,
                    ValidAudiences = new[] { "admin", "attendee" },
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = signingKey,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                    // Ensure the JWT role/name mapping is explicit so ClaimTypes.Role is used by policies
                    RoleClaimType = ClaimTypes.Role,
                    NameClaimType = ClaimTypes.Name
                };

                jwtBearerOptions.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"].FirstOrDefault();
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub/meetings"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        // Normalize common role claim formats into ClaimTypes.Role so RequireRole works reliably.
                        var identity = context.Principal?.Identity as ClaimsIdentity;
                        if (identity != null)
                        {
                            var roleValues = identity.FindAll("role").Select(c => c.Value).ToList();
                            roleValues.AddRange(identity.FindAll("roles").Select(c => c.Value));

                            // If roles are provided as a JSON array in a single claim value (e.g. "[\"Attendee\"]"), try to parse
                            for (int i = 0; i < roleValues.Count; i++)
                            {
                                var v = roleValues[i];
                                if (!string.IsNullOrWhiteSpace(v) && v.TrimStart().StartsWith("["))
                                {
                                    try
                                    {
                                        var parsed = JsonSerializer.Deserialize<string[]>(v);
                                        if (parsed != null)
                                        {
                                            // replace this entry with parsed entries
                                            roleValues.RemoveAt(i);
                                            roleValues.InsertRange(i, parsed);
                                            i += parsed.Length - 1;
                                        }
                                    }
                                    catch
                                    {
                                        // ignore parse errors
                                    }
                                }
                            }

                            foreach (var rv in roleValues.Distinct())
                            {
                                if (!identity.HasClaim(ClaimTypes.Role, rv))
                                {
                                    identity.AddClaim(new Claim(ClaimTypes.Role, rv));
                                }
                            }
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        return services;
    }

    private static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy("AttendeeOnly", policy =>
            {
                policy.RequireRole("Attendee");
            });

            options.AddPolicy("AdminOnly", policy =>
            {
                policy.RequireRole("Admin", "Administrator");
            });

            options.AddPolicy("AdminOrAttendee", policy =>
            {
                policy.RequireRole("Admin", "Administrator", "Attendee");
            });
        });

        return services;
    }
}