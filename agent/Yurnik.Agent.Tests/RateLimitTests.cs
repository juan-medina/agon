// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

using Yurnik.Agent.Api;
using Yurnik.Agent.Infrastructure;
using Yurnik.Agent.Queue;
using Xunit;

namespace Yurnik.Agent.Tests;

/// <summary>
/// Tests for 429 classification in YurnikClient and the circuit breaker in QueueProcessor.
/// </summary>
public class RateLimitTests : IDisposable
{
    readonly Database _db;
    readonly EventQueue _queue;
    readonly FakeYurnikClient _client = new();
    readonly FakeAuthState _auth = new();
    readonly QueueProcessor _processor;
    readonly string _dbPath;

    public RateLimitTests()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"yurnik_ratelimit_{Guid.NewGuid():N}.db");
        _db = new Database(_dbPath);
        _db.Migrate();
        _queue = new EventQueue(_db);
        _processor = new QueueProcessor(_queue, _client, _auth);
    }

    [Fact]
    public async Task DrainAsync_WhenRateLimited_SkipsAllEvents()
    {
        _client.NextResult = ApiResult.RateLimited;

        _queue.Enqueue(QueueEventType.GameStarted, 1, "game.exe", "My Game");
        await _processor.DrainAsync();

        _queue.Enqueue(QueueEventType.GameEnded, 1, "game.exe", "My Game");
        await _processor.DrainAsync(); // trips the circuit breaker

        var callsBefore = _client.Calls.Count;

        // Drain again immediately — circuit breaker should block all API calls.
        _queue.Enqueue(QueueEventType.GameEnded, 2, "other.exe", "Other Game");
        await _processor.DrainAsync();

        Assert.Equal(callsBefore, _client.Calls.Count);
    }

    [Fact]
    public async Task DrainAsync_OnRateLimited_EventRemainsInQueue()
    {
        _client.NextResult = ApiResult.RateLimited;

        _queue.Enqueue(QueueEventType.GameStarted, 1, "game.exe", "My Game");
        await _processor.DrainAsync();

        _queue.Enqueue(QueueEventType.GameEnded, 1, "game.exe", "My Game");
        await _processor.DrainAsync();

        var remaining = _queue.Peek();
        Assert.Contains(remaining, e => e.Type == QueueEventType.GameEnded);
    }

    public void Dispose()
    {
        _processor.Dispose();
        try { File.Delete(_dbPath); } catch { }
    }
}
