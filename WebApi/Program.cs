using System.Text;
using Application.Persistence;
using Application.Services;
using Microsoft.EntityFrameworkCore;
using WebApi.Infrastructure;
using WebApi.Realtime;
using MediatR;
using Application.Agendas.Queries.GetAgenda;
using DotNetEnv;

// Load .env file for local development (Render.io will use actual environment variables)
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Log environment variables for verification
EnvironmentLogger.LogEnvironmentVariables();

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
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IVotingService, VotingService>();
builder.Services.AddMediatR(typeof(GetAgendaQueryHandler).Assembly);
builder.Services.AddControllers();

var app = builder.Build();

// Middleware pipeline
app.UseGlobalExceptionHandler();
app.UseRouting();

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

// Verify database connectivity on startup
await app.UseDatabaseHealthCheck();

app.MapFallbackToFile("index.html");

app.Run();
