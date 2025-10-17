using Application.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WebApi.Controllers;

[ApiController]
[Route("api/dev")] // <- base route for this controller
[Produces("application/json")]
public class DevController : ControllerBase
{
    private readonly AppDbContext _db;
    public DevController(AppDbContext db) => _db = db;

    [HttpGet("pingdb")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> PingDb()
    {
        Console.WriteLine("Connected");

        var conn = (Microsoft.Data.Sqlite.SqliteConnection)_db.Database.GetDbConnection();
        await conn.OpenAsync();

        var tables = new List<string>();
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;";
            using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync()) tables.Add(rdr.GetString(0));
        }

        int? orgCount = tables.Contains("Organisation") ? await _db.Organisations.CountAsync() : null;

        return Ok(new { dbPath = conn.DataSource, tables, orgCount });
    }
}