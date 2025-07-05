-- Cloudflare D1 Database Schema for Voice Note Transcription Service
-- Phase 1: Foundation Setup

-- Users table - stores user information and approval status
CREATE TABLE users (
  id           TEXT PRIMARY KEY,          -- cuid() identifier
  google_email TEXT UNIQUE NOT NULL,     -- Google OAuth email
  slug         TEXT UNIQUE NOT NULL,      -- 6-char nanoid for email aliases
  approved     INTEGER NOT NULL DEFAULT 0, -- 0=pending, 1=approved
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Voice events table - stores metadata about voice messages (no transcript storage)
CREATE TABLE voice_events (
  id              TEXT PRIMARY KEY,          -- cuid() identifier
  user_id         TEXT NOT NULL,             -- Reference to users.id
  received_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_sec    INTEGER,                   -- Duration in seconds
  bytes           INTEGER,                   -- File size in bytes
  status          TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  processing_type TEXT,                      -- 'raw', 'cleanup', 'summary'
  completed_at    DATETIME,                  -- When processing completed
  error_message   TEXT,                      -- Error details if failed
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- User preferences table - extensible design for future features
CREATE TABLE user_preferences (
  user_id                TEXT PRIMARY KEY,  -- One-to-one with users
  transcript_processing  TEXT DEFAULT 'raw', -- 'raw', 'cleanup', 'summary'
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(google_email);
CREATE INDEX idx_users_slug ON users(slug);
CREATE INDEX idx_users_approved ON users(approved);
CREATE INDEX idx_voice_events_user_id ON voice_events(user_id);
CREATE INDEX idx_voice_events_received_at ON voice_events(received_at);
CREATE INDEX idx_voice_events_status ON voice_events(status);
CREATE INDEX idx_user_preferences_processing ON user_preferences(transcript_processing);

-- Insert admin user if needed (replace with your admin email)
-- INSERT INTO users (id, google_email, slug, approved) 
-- VALUES ('admin_cuid', 'admin@example.com', 'admin1', 1);

-- Insert default preferences for existing users (run after deployment)
-- INSERT INTO user_preferences (user_id, transcript_processing) 
-- SELECT id, 'raw' FROM users WHERE id NOT IN (SELECT user_id FROM user_preferences); 