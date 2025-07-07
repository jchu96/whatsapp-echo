-- Migration: Add API keys for iOS Shortcut integration
-- Run this on existing database to add API key support
-- Date: 2025-01-25

-- Step 1: Add api_key column to users table WITHOUT unique constraint initially
ALTER TABLE users ADD COLUMN api_key TEXT;

-- Step 2: Create index for API key lookups (performance optimization)
-- Note: Will add unique constraint after backfill

-- Step 3: Backfill existing users with API keys
-- This will be handled by the application to ensure proper key generation
-- Run the backfill function from the admin dashboard or via API call

-- Step 4: After backfill is complete, add unique constraint
-- This step should be run AFTER the application has generated API keys for all users:
-- CREATE UNIQUE INDEX idx_users_api_key_unique ON users(api_key);

-- Note: After running this migration, you need to:
-- 1. Deploy the updated application code
-- 2. Run the backfill function: await backfillApiKeys()
-- 3. Verify all users have API keys in the database
-- 4. Run: CREATE UNIQUE INDEX idx_users_api_key_unique ON users(api_key); 