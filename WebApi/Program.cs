using Application;
using Application.Abstractions;
using Application.Services;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(opts => 
    opts.AddDefaultPolicy(p => p
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod()));
builder.Services.AddSingleton<IGreetingService, GreetingService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors();

// 1) Serve files from wwwroot
app.UseDefaultFiles(); // serves index.html by default if present
app.UseStaticFiles();

// API endpoints
app.MapGet("/api/ping", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow }));
app.MapGet("/api/hello/{name}", (string name, IGreetingService svc) =>
    Results.Ok(new { message = svc.GetGreeting(name) }));

// 2) SPA Fallback for client-side routing (everything not /api/* or a real file)
app.MapFallbackToFile("index.html");

app.Run();