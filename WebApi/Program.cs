using System.Text;
using Application;
using Application.Abstractions;
using Application.Persistence;
using Application.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WebApi.Infrastructure;
using WebApi.Realtime;

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
builder.Services.AddSingleton<IGreetingService, GreetingService>();
builder.Services.AddSignalR();
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
            ValidateAudience = false,
            ValidateIssuerSigningKey = true, IssuerSigningKey = signingKey,
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts(); // optional for dev, good for prod
}
app.UseAuthentication();
app.UseAuthorization();
app.UseHttpsRedirection();
app.UseDefaultFiles(); 
app.UseStaticFiles();
app.MapControllers();
app.MapHub<PresenceHub>("/hub/presence");

//FAil fast test - if DB doesnt exist we crash here
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Don’t run migrations, don’t recreate schema
    // Just verify the file is accessible
    await db.Database.OpenConnectionAsync();
    await db.Database.CloseConnectionAsync();
}

app.Logger.LogInformation("Using DB: {Path}", 
    builder.Configuration.GetConnectionString("Default"));

app.MapFallbackToFile("index.html");

Console.WriteLine(BCrypt.Net.BCrypt.HashPassword("admin"));


app.Run();