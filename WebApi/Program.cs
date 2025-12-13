using System.Text;
using Application.Persistence;
using Application.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WebApi.Infrastructure;
using WebApi.Realtime;
using MediatR;
using Application.Agendas.Queries.GetAgenda;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(opts => 
    opts.AddDefaultPolicy(p => p
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod()));
builder.Services.AddSignalR();
builder.Services.AddScoped<IMeetingBroadcaster, MeetingBroadcaster>();
builder.Services.AddScoped<IAdmissionTicketService, AdmissionTicketService>();
builder.Services.AddScoped<IMeetingCodeService, MeetingCodeService>();
builder.Services.AddMediatR(typeof(GetAgendaQueryHandler).Assembly);
// Controllers are authorized per-action
builder.Services.AddControllers();

var jwtKey   = builder.Configuration["Jwt:Key"]    ?? throw new Exception("Jwt:Key missing");
var jwtIssuer= builder.Configuration["Jwt:Issuer"] ?? "fa-live-mvp";
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true, ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudiences = new[] { "admin", "attendee" },
            ValidateIssuerSigningKey = true, IssuerSigningKey = signingKey,
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1)
        };

        o.Events = new JwtBearerEvents
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
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AttendeeOnly", policy =>
    {
        policy.RequireRole("Attendee");
    });

    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireRole("Admin");
    });
});

var app = builder.Build();
app.UseRouting();

// Centralized exception handling middleware
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled exception processing request");
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new { error = "An internal server error occurred." });
        await context.Response.WriteAsync(payload);
    }
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}
app.UseAuthentication();
app.UseAuthorization();
app.UseHttpsRedirection();
app.UseDefaultFiles(); 

app.UseStaticFiles();
app.MapControllers();
app.MapHub<MeetingHub>("/hub/meetings");

// Fail fast test - if DB doesn't exist we crash here
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.OpenConnectionAsync();
    await db.Database.CloseConnectionAsync();
}

app.Logger.LogInformation("Using DB: {Path}", 
    builder.Configuration.GetConnectionString("Default"));

app.MapFallbackToFile("index.html");

// Generate a hash for seeding an admin user (console output)
Console.WriteLine(BCrypt.Net.BCrypt.HashPassword("admin"));


app.Run();