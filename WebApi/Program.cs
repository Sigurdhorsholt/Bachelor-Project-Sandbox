using Application;
using Application.Abstractions;
using Application.Persistence;
using Application.Services;
using Microsoft.EntityFrameworkCore;
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

app.Run();