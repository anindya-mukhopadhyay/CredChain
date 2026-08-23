ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS credential_payload jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_credentials_payload_gin
  ON credentials USING gin (credential_payload);

