// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

using Microsoft.Win32;

namespace Yurnik.Agent.Infrastructure;

static class StartupRegistrar
{
    const string RunKey = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";
    const string ValueName = "Yurnik";

    public static void Register()
    {
        var exePath = Environment.ProcessPath;
        if (exePath is null)
        {
            Log.Warn("Could not determine process path — startup entry not registered");
            return;
        }

        using var key = Registry.CurrentUser.OpenSubKey(RunKey, writable: true);
        if (key is null)
        {
            Log.Warn("Could not open HKCU Run registry key");
            return;
        }

        key.SetValue(ValueName, $"\"{exePath}\"");
        Log.Info("Startup entry registered");
    }

    public static void Unregister()
    {
        using var key = Registry.CurrentUser.OpenSubKey(RunKey, writable: true);
        key?.DeleteValue(ValueName, throwOnMissingValue: false);
    }
}
