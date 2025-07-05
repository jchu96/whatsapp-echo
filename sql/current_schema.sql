
 ⛅️ wrangler 4.22.0 (update available 4.23.0)
─────────────────────────────────────────────
🌀 Executing on remote database: [DATABASE_NAME]
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 1 command in 0.3446ms
[
  {
    "results": [
      {
        "sql": "CREATE TABLE _cf_KV (\n        key TEXT PRIMARY KEY,\n        value BLOB\n      ) WITHOUT ROWID"
      },
      {
        "sql": "CREATE TABLE users (\r\n  id           TEXT PRIMARY KEY,          -- cuid() identifier\r\n  google_email TEXT UNIQUE NOT NULL,     -- Google OAuth email\r\n  slug         TEXT UNIQUE NOT NULL,      -- 6-char nanoid for email aliases\r\n  approved     INTEGER NOT NULL DEFAULT 0, -- 0=pending, 1=approved\r\n  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP\r\n)"
      },
      {
        "sql": "CREATE TABLE voice_events (\r\n  id           TEXT PRIMARY KEY,          -- cuid() identifier\r\n  user_id      TEXT NOT NULL,             -- Reference to users.id\r\n  received_at  DATETIME DEFAULT CURRENT_TIMESTAMP,\r\n  duration_sec INTEGER,                   -- Duration in seconds\r\n  bytes        INTEGER, status TEXT DEFAULT 'processing', processing_type TEXT, completed_at DATETIME, error_message TEXT, enhancements_requested TEXT,                   -- File size in bytes\r\n  FOREIGN KEY(user_id) REFERENCES users(id)\r\n)"
      },
      {
        "sql": "CREATE INDEX idx_users_email ON users(google_email)"
      },
      {
        "sql": "CREATE INDEX idx_users_slug ON users(slug)"
      },
      {
        "sql": "CREATE INDEX idx_users_approved ON users(approved)"
      },
      {
        "sql": "CREATE INDEX idx_voice_events_user_id ON voice_events(user_id)"
      },
      {
        "sql": "CREATE INDEX idx_voice_events_received_at ON voice_events(received_at)"
      },
      {
        "sql": "CREATE TABLE user_preferences (\r\n  user_id                TEXT PRIMARY KEY,  -- One-to-one with users\r\n  transcript_processing  TEXT DEFAULT 'raw', -- 'raw', 'cleanup', 'summary'\r\n  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,\r\n  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP, send_cleaned_transcript INTEGER DEFAULT 0, send_summary INTEGER DEFAULT 0,\r\n  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE\r\n)"
      },
      {
        "sql": "CREATE INDEX idx_voice_events_status ON voice_events(status)"
      },
      {
        "sql": "CREATE INDEX idx_user_preferences_cleaned ON user_preferences(send_cleaned_transcript)"
      },
      {
        "sql": "CREATE INDEX idx_user_preferences_summary ON user_preferences(send_summary)"
      },
      {
        "sql": "CREATE INDEX idx_voice_events_enhancements ON voice_events(enhancements_requested)"
      }
    ],
    "success": true,
    "meta": {
      "served_by": "v3-prod",
      "served_by_region": "WEUR",
      "served_by_primary": true,
      "timings": {
        "sql_duration_ms": 0.3446
      },
      "duration": 0.3446,
      "changes": 0,
      "last_row_id": 0,
      "changed_db": false,
      "size_after": 81920,
      "rows_read": 18,
      "rows_written": 0
    }
  }
]
