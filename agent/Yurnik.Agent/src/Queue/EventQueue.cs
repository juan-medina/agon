// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

using System.Text.Json;
using Microsoft.Data.Sqlite;
using Yurnik.Agent.Infrastructure;

namespace Yurnik.Agent.Queue;

enum QueueEventType { GameStarted, GameEnded }

record QueueEvent(
    long Id,
    QueueEventType Type,
    int Pid,
    string ExeName,
    string WindowTitle,
    DateTimeOffset OccurredAt,
    int Attempts
);

/// <summary>
/// SQLite-backed event queue between ProcessWatcher and QueueProcessor.
/// ProcessWatcher writes; QueueProcessor reads and deletes on success.
/// </summary>
sealed class EventQueue(Database db)
{
    readonly TimeSpan _ttl = TimeSpan.FromDays(3);

    public void Enqueue(QueueEventType type, int pid, string exeName, string windowTitle)
    {
        var payload = JsonSerializer.Serialize(new { exe_name = exeName, window_title = windowTitle });
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        using var conn = db.OpenConnection();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT OR IGNORE INTO queue (type, pid, exe_name, payload, created_at)
            VALUES ($type, $pid, $exe, $payload, $now)
            """;
        cmd.Parameters.AddWithValue("$type", type.ToString());
        cmd.Parameters.AddWithValue("$pid", pid);
        cmd.Parameters.AddWithValue("$exe", exeName);
        cmd.Parameters.AddWithValue("$payload", payload);
        cmd.Parameters.AddWithValue("$now", now);
        cmd.ExecuteNonQuery();

        Log.Info($"Queued {type} for {exeName} (pid {pid})");
    }

    /// <summary>
    /// Returns pending events ordered by id ascending, excluding stale ones.
    /// </summary>
    public List<QueueEvent> Peek(int limit = 20)
    {
        var cutoff = DateTimeOffset.UtcNow.Subtract(_ttl).ToUnixTimeSeconds();

        using var conn = db.OpenConnection();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id, type, pid, exe_name, payload, created_at, attempts
            FROM queue
            WHERE created_at >= $cutoff
            ORDER BY id ASC
            LIMIT $limit
            """;
        cmd.Parameters.AddWithValue("$cutoff", cutoff);
        cmd.Parameters.AddWithValue("$limit", limit);

        var events = new List<QueueEvent>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            var typeStr = reader.GetString(1);
            var type = Enum.Parse<QueueEventType>(typeStr);
            var payload = JsonDocument.Parse(reader.GetString(4)).RootElement;
            var windowTitle = payload.TryGetProperty("window_title", out var wt) ? wt.GetString() ?? "" : "";

            events.Add(new QueueEvent(
                Id: reader.GetInt64(0),
                Type: type,
                Pid: reader.GetInt32(2),
                ExeName: reader.GetString(3),
                WindowTitle: windowTitle,
                OccurredAt: DateTimeOffset.FromUnixTimeSeconds(reader.GetInt64(5)),
                Attempts: reader.GetInt32(6)
            ));
        }
        return events;
    }

    public void Delete(long id)
    {
        using var conn = db.OpenConnection();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM queue WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.ExecuteNonQuery();
    }

    public void IncrementAttempts(long id)
    {
        using var conn = db.OpenConnection();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "UPDATE queue SET attempts = attempts + 1 WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);
        cmd.ExecuteNonQuery();
    }

    /// <summary>
    /// Deletes events older than the TTL. Called at the start of each drain cycle.
    /// </summary>
    public void Evict()
    {
        var cutoff = DateTimeOffset.UtcNow.Subtract(_ttl).ToUnixTimeSeconds();
        using var conn = db.OpenConnection();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM queue WHERE created_at < $cutoff";
        cmd.Parameters.AddWithValue("$cutoff", cutoff);
        var deleted = cmd.ExecuteNonQuery();
        if (deleted > 0)
            Log.Info($"Evicted {deleted} stale queue event(s)");
    }
}
