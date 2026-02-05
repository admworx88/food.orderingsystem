-- Migration: Create audit_log table
-- Created: 2026-02-05 14:16:00
-- Purpose: Admin audit trail

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,               -- create, update, delete
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, created_at DESC);

-- Rollback:
-- DROP INDEX IF EXISTS idx_audit_log_table;
-- DROP INDEX IF EXISTS idx_audit_log_created;
-- DROP TABLE IF EXISTS audit_log;
