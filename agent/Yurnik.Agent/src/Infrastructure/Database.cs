// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

using Microsoft.Data.Sqlite;
using Yurnik.Agent.Infrastructure;

namespace Yurnik.Agent.Infrastructure;

/// <summary>
/// Owns the SQLite connection and schema initialisation.
/// All other components receive this and call OpenConnection() to get a connection.
/// </summary>
sealed class Database
{
    readonly string _path;

    public Database(string path)
    {
        _path = path;
    }

    public SqliteConnection OpenConnection()
    {
        var conn = new SqliteConnection($"Data Source={_path}");
        conn.Open();

        // WAL mode for better concurrent read/write.
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "PRAGMA journal_mode=WAL;";
        cmd.ExecuteNonQuery();

        return conn;
    }

    public void Migrate()
    {
        Log.Info($"Running database migrations on {_path}");
        using var conn = OpenConnection();

        // PRAGMA user_version tracks the schema generation. Version 0 means a fresh
        // install or a pre-versioning database — drop any old tables and start clean.
        using var versionCmd = conn.CreateCommand();
        versionCmd.CommandText = "PRAGMA user_version;";
        var version = (long)(versionCmd.ExecuteScalar() ?? 0L);

        if (version == 0)
        {
            Log.Info("Schema is unversioned — recreating tables");
            using var dropCmd = conn.CreateCommand();
            dropCmd.CommandText = """
                DROP TABLE IF EXISTS queue;
                DROP TABLE IF EXISTS schema_version;
                """;
            dropCmd.ExecuteNonQuery();
        }

        using var schemaCmd = conn.CreateCommand();
        schemaCmd.CommandText = """
            CREATE TABLE IF NOT EXISTS queue (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                type        TEXT    NOT NULL,
                pid         INTEGER NOT NULL,
                exe_name    TEXT    NOT NULL,
                payload     TEXT    NOT NULL,
                created_at  INTEGER NOT NULL,
                attempts    INTEGER NOT NULL DEFAULT 0,
                UNIQUE(pid, type)
            );

            CREATE INDEX IF NOT EXISTS queue_exe_type
                ON queue(exe_name, type, created_at);
            """;
        schemaCmd.ExecuteNonQuery();

        using var pragmaCmd = conn.CreateCommand();
        pragmaCmd.CommandText = "PRAGMA user_version = 1;";
        pragmaCmd.ExecuteNonQuery();

        Log.Info("Database migrations complete");
    }
}
