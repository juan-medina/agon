// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

using Yurnik.Agent.Api;
using Yurnik.Agent.Auth;
using Yurnik.Agent.Infrastructure;

namespace Yurnik.Agent.Queue;

/// <summary>
/// Periodically drains the event queue and sends events to the API.
///
/// Only runs while authenticated. Pauses on 401 and signals AuthManager.
/// Uses exponential backoff per event on transient failures.
///
/// A pending journey is only created on the API once the game ends, so the
/// UI only shows journeys with a real duration.
/// </summary>
sealed class QueueProcessor(EventQueue queue, IYurnikClient client, IAuthState auth) : IDisposable
{
    static readonly TimeSpan DrainInterval = TimeSpan.FromSeconds(30);
    static readonly TimeSpan RateLimitCooldown = TimeSpan.FromMinutes(5);
    static readonly TimeSpan[] Backoff =
    [
        TimeSpan.FromSeconds(30),
        TimeSpan.FromMinutes(2),
        TimeSpan.FromMinutes(10),
        TimeSpan.FromMinutes(30),
    ];

    // Tracks the start time of sessions detected so far (no API call yet), keyed by pid.
    readonly Dictionary<int, DateTimeOffset> _activeSessions = [];

    // Circuit breaker: set when the API returns 429. Drain is skipped until this clears.
    DateTimeOffset? _rateLimitedUntil;

    readonly CancellationTokenSource _cts = new();
    Task? _drainTask;

    public void Start()
    {
        _drainTask = DrainLoopAsync(_cts.Token);
        Log.Info("QueueProcessor started");
    }

    public void Stop()
    {
        _cts.Cancel();
        try { _drainTask?.Wait(5000); }
        catch (AggregateException) { }
        Log.Info("QueueProcessor stopped");
    }

    async Task DrainLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            if (auth.IsAuthenticated)
            {
                queue.Evict();
                await DrainAsync(ct);
            }

            await Task.Delay(DrainInterval, ct).ConfigureAwait(false);
        }
    }

    internal async Task DrainAsync(CancellationToken ct = default)
    {
        if (_rateLimitedUntil is { } until && DateTimeOffset.UtcNow < until)
        {
            Log.Info($"Rate limited — drain skipped until {until:HH:mm:ss}Z");
            return;
        }
        _rateLimitedUntil = null;

        var events = queue.Peek();
        foreach (var ev in events)
        {
            if (ct.IsCancellationRequested) break;

            // Respect backoff — skip events that have failed recently.
            if (ev.Attempts > 0)
            {
                var backoff = Backoff[Math.Min(ev.Attempts - 1, Backoff.Length - 1)];
                if (DateTimeOffset.UtcNow - ev.OccurredAt < backoff)
                    continue;
            }

            var handled = ev.Type switch
            {
                QueueEventType.GameStarted => HandleGameStarted(ev),
                QueueEventType.GameEnded   => await HandleGameEnded(ev, ct),
                _ => true,
            };

            if (handled)
                queue.Delete(ev.Id);
            else
                queue.IncrementAttempts(ev.Id);
        }
    }

    bool HandleGameStarted(QueueEvent ev)
    {
        _activeSessions[ev.Pid] = ev.OccurredAt;
        Log.Info($"Session started: {ev.ExeName} (pid {ev.Pid}) at {ev.OccurredAt:HH:mm:ss}Z");
        return true;
    }

    async Task<bool> HandleGameEnded(QueueEvent ev, CancellationToken ct)
    {
        if (!_activeSessions.TryGetValue(ev.Pid, out var startedAt))
        {
            // No tracked start — game was running before the agent started, or agent reconnected.
            Log.Warn($"No tracked session for {ev.ExeName} (pid {ev.Pid}), discarding game_ended");
            return true;
        }

        Log.Info($"Creating journey: {ev.ExeName} — \"{ev.WindowTitle}\" ({startedAt:HH:mm:ss}Z → {ev.OccurredAt:HH:mm:ss}Z)");
        var result = await client.CreatePendingJourneyAsync(ev.ExeName, ev.WindowTitle, startedAt, ev.OccurredAt);

        if (result.Status == ApiResult.Unauthorized)
        {
            auth.OnUnauthorized();
            return false;
        }

        if (result.Status == ApiResult.RateLimited)
        {
            _rateLimitedUntil = DateTimeOffset.UtcNow + RateLimitCooldown;
            Log.Warn($"Rate limited — pausing drain until {_rateLimitedUntil:HH:mm:ss}Z");
            return false;
        }

        if (result.Status == ApiResult.TransientFailure)
            return false;

        _activeSessions.Remove(ev.Pid);

        if (result.JourneyId is null)
            Log.Info($"Journey excluded: {ev.ExeName}");
        else
            Log.Info($"Journey created: {ev.ExeName} → id={result.JourneyId}");

        return true;
    }

    public void Dispose() => Stop();
}
