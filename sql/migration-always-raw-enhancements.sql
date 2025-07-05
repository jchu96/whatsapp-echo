-- Migration: Update user preferences to "Always Raw + Optional Enhancements" model
-- This allows users to get immediate raw transcripts plus optional enhanced versions
-- Date: 2024-12-19

-- Step 1: Add new boolean columns for enhancement preferences
-- Note: SQLite doesn't support DROP COLUMN, so we'll add new columns and migrate data
ALTER TABLE user_preferences ADD COLUMN send_cleaned_transcript INTEGER DEFAULT 0;
ALTER TABLE user_preferences ADD COLUMN send_summary INTEGER DEFAULT 0;

-- Step 2: Migrate existing preferences to new boolean system
-- Convert old transcript_processing values to new boolean flags
UPDATE user_preferences SET 
  send_cleaned_transcript = CASE 
    WHEN transcript_processing = 'cleanup' THEN 1
    ELSE 0
  END,
  send_summary = CASE 
    WHEN transcript_processing = 'summary' THEN 1
    ELSE 0
  END;

-- Step 3: Create new indexes for the boolean columns
CREATE INDEX IF NOT EXISTS idx_user_preferences_cleaned ON user_preferences(send_cleaned_transcript);
CREATE INDEX IF NOT EXISTS idx_user_preferences_summary ON user_preferences(send_summary);

-- Step 4: Drop old index (if it exists)
DROP INDEX IF EXISTS idx_user_preferences_processing;

-- Step 5: Update voice_events to track multiple enhancement types
-- Add a column to track which enhancements were requested for this event
ALTER TABLE voice_events ADD COLUMN enhancements_requested TEXT; -- JSON array of enhancement types

-- Step 6: Create index for enhancement tracking
CREATE INDEX IF NOT EXISTS idx_voice_events_enhancements ON voice_events(enhancements_requested);

-- Note: We're keeping the transcript_processing column for backward compatibility
-- It can be removed in a future migration once we're confident the new system works
-- To remove it completely, you would need to recreate the table (SQLite limitation) 