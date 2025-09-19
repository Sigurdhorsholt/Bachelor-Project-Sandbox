using Application;
using Application.Abstractions;
using Application.Services;
using WebApi.Realtime;

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
builder.Services.AddSignalR();

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
// 1) Serve files from wwwroot
app.UseDefaultFiles(); // serves index.html by default if present
app.UseStaticFiles();

// API endpoints
app.MapGet("/api/ping", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow }));
app.MapGet("/api/hello/{name}", (string name, IGreetingService svc) =>
    Results.Ok(new { message = svc.GetGreeting(name) }));

// ---- Mock Auth API ----
app.MapGet("/api/auth/current", (HttpRequest req) =>
{
    var isAdmin = req.Cookies.TryGetValue("auth", out var v) && v == "admin";
    return Results.Ok(new
    {
        id = isAdmin ? "1" : "anon",
        name = isAdmin ? "Admin" : "Guest",
        role = isAdmin ? "admin" : "guest"
    });
});

// POST /api/auth/login -> sets cookie if creds match
app.MapPost("/api/auth/login", (LoginRequest req, HttpResponse res) =>
{
    if (string.Equals(req.Email, "admin@demo.dev", StringComparison.OrdinalIgnoreCase) && req.Password == "admin")
    {
        // Dev cookie (HTTP on :5173 via Vite proxy): Secure=false; Prod should set Secure=true on HTTPS.
        res.Cookies.Append("auth", "admin", new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = false,                               // set true in prod (HTTPS)
            Expires = DateTimeOffset.UtcNow.AddHours(8),
            Path = "/"
        });
        return Results.Ok(new { id = "1", name = "Admin", role = "admin" });
    }
    return Results.Unauthorized();
});

// POST /api/auth/logout -> clears cookie
app.MapPost("/api/auth/logout", (HttpResponse res) =>
{
    res.Cookies.Delete("auth", new CookieOptions { Path = "/" });
    return Results.Ok(new { ok = true });
});

app.MapPost("/api/auth/verify-code", (VerifyCodeRequest req) =>
{
    // MOCK: any non-empty code allows vote "demo"
    var ok = !string.IsNullOrWhiteSpace(req.Code);
    return Results.Ok(new { ok, voteId = ok ? "demo" : null });
});

app.MapHub<PresenceHub>("/hub/presence");

// 2) SPA Fallback for client-side routing (everything not /api/* or a real file)
app.MapFallbackToFile("index.html");

app.Run();

//temporary records.. delete later
record LoginRequest(string Email, string Password);
record VerifyCodeRequest(string Code);