CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_type text NOT NULL CHECK (
    organization_type IN ('UNIVERSITY', 'COLLEGE', 'COMPANY', 'CERTIFICATION_PROVIDER', 'TRAINING_INSTITUTE', 'OTHER')
  ),
  verification_status text NOT NULL DEFAULT 'PENDING' CHECK (
    verification_status IN ('PENDING', 'VERIFIED', 'SUSPENDED')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL CHECK (
    role IN ('SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'ISSUER', 'VERIFIER')
  ),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lower_unique UNIQUE (email)
);

CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_reference text,
  given_name text NOT NULL,
  family_name text NOT NULL,
  date_of_birth date,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, external_reference)
);

CREATE TABLE credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_number text NOT NULL UNIQUE,
  credential_type text NOT NULL,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  issuer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  issue_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'FINALIZED', 'ISSUED', 'REVOKED')
  ),
  canonical_hash text,
  document_uri text,
  verification_url text,
  blockchain_tx_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credential_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_credential_id uuid NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  target_credential_id uuid NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (
    relationship_type IN ('DERIVED_FROM', 'PART_OF', 'SUPPORTS', 'PREREQUISITE_FOR')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_credential_id, target_credential_id, relationship_type),
  CHECK (source_credential_id <> target_credential_id)
);

CREATE TABLE semester_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL UNIQUE REFERENCES credentials(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  semester_number integer NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  result_status text NOT NULL CHECK (result_status IN ('PASS', 'FAIL', 'WITHHELD')),
  semester_gpa numeric(4, 2),
  overall_gpa numeric(4, 2),
  subjects jsonb NOT NULL DEFAULT '[]',
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE credential_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  storage_uri text NOT NULL,
  content_type text NOT NULL,
  sha256_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE blockchain_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid REFERENCES credentials(id) ON DELETE SET NULL,
  network_name text NOT NULL,
  chain_id integer NOT NULL,
  transaction_hash text UNIQUE,
  contract_address text NOT NULL,
  status text NOT NULL CHECK (
    status IN ('SUBMITTED', 'CONFIRMED', 'FAILED')
  ),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  error_message text
);

ALTER TABLE credentials
  ADD CONSTRAINT credentials_blockchain_tx_fk
  FOREIGN KEY (blockchain_tx_id)
  REFERENCES blockchain_transactions(id)
  ON DELETE SET NULL;

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  event_type text NOT NULL,
  event_metadata jsonb NOT NULL DEFAULT '{}',
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL UNIQUE REFERENCES credentials(id) ON DELETE CASCADE,
  revoked_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason_code text NOT NULL,
  reason_note text,
  revoked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_candidates_organization_id ON candidates(organization_id);
CREATE INDEX idx_credentials_candidate_id ON credentials(candidate_id);
CREATE INDEX idx_credentials_organization_id ON credentials(organization_id);
CREATE INDEX idx_credentials_status ON credentials(status);
CREATE INDEX idx_credential_relationships_source ON credential_relationships(source_credential_id);
CREATE INDEX idx_credential_relationships_target ON credential_relationships(target_credential_id);
CREATE INDEX idx_semester_results_candidate_semester ON semester_results(candidate_id, semester_number);
CREATE INDEX idx_blockchain_transactions_credential_id ON blockchain_transactions(credential_id);
CREATE INDEX idx_audit_logs_organization_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

