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
using System.Threading.Tasks;

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
            ValidateAudience = true,
            ValidAudiences = new[] { "admin", "attendee" },
            ValidateIssuerSigningKey = true, IssuerSigningKey = signingKey,
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(1)
        };

        // Allow access_token query string when connecting to SignalR hubs (WebSockets can't send Authorization header)
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"].FirstOrDefault();
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub/meeting"))
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
        policy.RequireRole("Attendee"));
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAssertion(context =>
            context.User.HasClaim(c => c.Type == System.Security.Claims.ClaimTypes.Role && c.Value != "Attendee")));
});

var app = builder.Build();

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

app.MapHub<MeetingHub>("/hub/meeting");

//FAil fast test - if DB doesn't exist we crash here
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.OpenConnectionAsync();
    await db.Database.CloseConnectionAsync();
}

app.Logger.LogInformation("Using DB: {Path}", 
    builder.Configuration.GetConnectionString("Default"));

app.MapFallbackToFile("index.html");


// Just to generate a hash for seeding an admin user
Console.WriteLine(BCrypt.Net.BCrypt.HashPassword("admin"));


app.Run();