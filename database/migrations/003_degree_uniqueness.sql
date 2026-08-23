-- Phase 4.1: Database-level protection against duplicate active B.Tech degree credentials per candidate
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_btech_degree_per_candidate
ON credentials (candidate_id, credential_type)
WHERE credential_type = 'BTECH_DEGREE' AND status <> 'REVOKED';
