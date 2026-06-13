// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

using System.Diagnostics;

namespace Yurnik.Agent.Infrastructure;

static class Log
{
    static readonly string _logPath;
    static readonly object _lock = new();

    static Log()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var dir = Path.Combine(appData, "Yurnik");
        Directory.CreateDirectory(dir);
        _logPath = Path.Combine(dir, "yurnik.log");
    }

    public static void Reset()
    {
        lock (_lock)
        {
            try { File.Delete(_logPath); }
            catch { /* ignore */ }
        }
    }

    public static void Info(string message) => Write("INFO ", message);
    public static void Warn(string message) => Write("WARN ", message);
    public static void Error(string message) => Write("ERROR", message);
    public static void Error(string message, Exception ex) => Write("ERROR", $"{message}: {ex}");

    // Stripped entirely from Release builds — calls (and their argument
    // expressions) are removed at compile time, so this is zero-cost there.
    [Conditional("DEBUG")]
    public static void Debug(string message) => Write("DEBUG", message);

    static void Write(string level, string message)
    {
        var line = $"{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ} [{level}] {message}";
        lock (_lock)
        {
            try { File.AppendAllText(_logPath, line + Environment.NewLine); }
            catch { /* never crash on logging */ }
        }
    }
}
