-- Migration: Add user preferences and voice event status tracking
-- Run this on existing database to add new smart routing features
-- Date: 2024-12-19

-- Step 1: Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id                TEXT PRIMARY KEY,  -- One-to-one with users
  transcript_processing  TEXT DEFAULT 'raw', -- 'raw', 'cleanup', 'summary'
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step 2: Add new columns to voice_events table
-- Note: SQLite ALTER TABLE has limitations, so we add columns one by one
ALTER TABLE voice_events ADD COLUMN status TEXT DEFAULT 'processing';
ALTER TABLE voice_events ADD COLUMN processing_type TEXT;
ALTER TABLE voice_events ADD COLUMN completed_at DATETIME;
ALTER TABLE voice_events ADD COLUMN error_message TEXT;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voice_events_status ON voice_events(status);
CREATE INDEX IF NOT EXISTS idx_user_preferences_processing ON user_preferences(transcript_processing);

-- Step 4: Insert default preferences for existing users
-- This ensures all existing users get 'raw' processing by default
INSERT INTO user_preferences (user_id, transcript_processing) 
SELECT id, 'raw' FROM users 
WHERE id NOT IN (SELECT user_id FROM user_preferences);

-- Step 5: Update existing voice_events to have 'completed' status
-- Since they were processed successfully, mark them as completed with 'raw' type
UPDATE voice_events 
SET status = 'completed', 
    processing_type = 'raw' 
WHERE status IS NULL; 