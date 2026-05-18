-- RR Digital App — Notifications & device tokens improvements
-- Adds metadata to notifications and proper indexes/unique on device_tokens.
-- Idempotent: uses IF NOT EXISTS and IF EXISTS guards throughout.

-- =========================================================================
-- notifications: add metadata column
-- =========================================================================
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- =========================================================================
-- device_tokens: index on user_id (hot path for token lookups)
-- =========================================================================
CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx
  ON device_tokens(user_id);

-- =========================================================================
-- device_tokens: unique index on (user_id, expo_push_token)
-- Prevents duplicate registrations when a device re-registers.
-- Required by upsertDeviceToken's ON CONFLICT clause.
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_user_token_unique_idx
  ON device_tokens(user_id, expo_push_token);
