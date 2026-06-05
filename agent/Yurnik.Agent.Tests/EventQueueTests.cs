// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

using Yurnik.Agent.Infrastructure;
using Yurnik.Agent.Queue;
using Xunit;

namespace Yurnik.Agent.Tests;

public class EventQueueTests : IDisposable
{
    readonly Database _db;
    readonly EventQueue _queue;
    readonly string _dbPath;

    public EventQueueTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"yurnik_test_{Guid.NewGuid():N}.db");
        _db = new Database(_dbPath);
        _db.Migrate();
        _queue = new EventQueue(_db);
    }

    [Fact]
    public void Enqueue_SamePidSameType_IsIgnored()
    {
        _queue.Enqueue(QueueEventType.GameStarted, 1234, "game.exe", "My Game");
        _queue.Enqueue(QueueEventType.GameStarted, 1234, "game.exe", "My Game");

        Assert.Single(_queue.Peek());
    }

    [Fact]
    public void Enqueue_SamePidDifferentType_BothQueued()
    {
        _queue.Enqueue(QueueEventType.GameStarted, 1234, "game.exe", "My Game");
        _queue.Enqueue(QueueEventType.GameEnded, 1234, "game.exe", "My Game");

        Assert.Equal(2, _queue.Peek().Count);
    }

    [Fact]
    public void Peek_ExcludesEventsOlderThanTtl()
    {
        using var conn = _db.OpenConnection();
        using var cmd = conn.CreateCommand();
        var oldTimestamp = DateTimeOffset.UtcNow.AddDays(-4).ToUnixTimeSeconds();
        cmd.CommandText = """
            INSERT INTO queue (type, pid, exe_name, payload, created_at)
            VALUES ('GameStarted', 9999, 'old.exe', '{}', $ts)
            """;
        cmd.Parameters.AddWithValue("$ts", oldTimestamp);
        cmd.ExecuteNonQuery();

        Assert.Empty(_queue.Peek());
    }

    [Fact]
    public void Delete_RemovesEvent()
    {
        _queue.Enqueue(QueueEventType.GameStarted, 1, "game.exe", "Game");
        var before = _queue.Peek();
        Assert.Single(before);

        _queue.Delete(before[0].Id);

        Assert.Empty(_queue.Peek());
    }

    public void Dispose()
    {
        try { File.Delete(_dbPath); } catch { }
    }
}
