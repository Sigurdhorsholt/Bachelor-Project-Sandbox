using System.Collections;

namespace WebApi.Infrastructure;

public static class EnvironmentLogger
{
    /// <summary>
    /// Logs environment variables for verification during application startup.
    /// Masks sensitive values like passwords and JWT keys.
    /// </summary>
    public static void LogEnvironmentVariables()
    {
        Console.WriteLine("========== ENVIRONMENT VARIABLES ==========");
        foreach (DictionaryEntry env in Environment.GetEnvironmentVariables())
        {
            var key = env.Key.ToString();
            if (key == null) continue;
            
            if (key.Contains("TEST") || key.Contains("Jwt") || key.Contains("Connection") || key.Contains("ASPNETCORE"))
            {
                var value = env.Value?.ToString() ?? "";
                
                // Mask sensitive values
                if (key.Contains("Password") || key.Contains("Jwt__Key"))
                {
                    value = MaskSensitiveValue(key, value);
                }
                
                Console.WriteLine($"ENV: {key} = {value}");
            }
        }
        Console.WriteLine("===========================================");
    }

    private static string MaskSensitiveValue(string key, string value)
    {
        if (key.Contains("Jwt__Key"))
        {
            return "***MASKED***";
        }

        // Mask passwords in connection strings
        if (key.Contains("Connection"))
        {
            var parts = value.Split(';');
            for (int i = 0; i < parts.Length; i++)
            {
                if (parts[i].Contains("Password=", StringComparison.OrdinalIgnoreCase))
                {
                    parts[i] = "Password=***MASKED***";
                }
            }
            return string.Join(";", parts);
        }

        return value;
    }
}


