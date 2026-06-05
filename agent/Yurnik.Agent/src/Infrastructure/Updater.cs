// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

using Velopack;
using Velopack.Sources;

namespace Yurnik.Agent.Infrastructure;

sealed class Updater
{
    const string RepoUrl = "https://github.com/juan-medina/yurnik";

    readonly UpdateManager _manager;

    public Updater()
    {
        _manager = new UpdateManager(new GithubSource(RepoUrl, null, false));
    }

    public async Task<UpdateInfo?> CheckAsync()
    {
        try
        {
            return await _manager.CheckForUpdatesAsync();
        }
        catch (Exception ex)
        {
            Log.Warn($"Update check failed: {ex.Message}");
            return null;
        }
    }

    public async Task DownloadAndRestartAsync(UpdateInfo update)
    {
        Log.Info($"Downloading update to v{update.TargetFullRelease.Version}");
        await _manager.DownloadUpdatesAsync(update);
        _manager.ApplyUpdatesAndRestart(update);
    }
}
