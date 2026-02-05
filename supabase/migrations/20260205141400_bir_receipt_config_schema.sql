-- Migration: Create bir_receipt_config table
-- Created: 2026-02-05 14:14:00
-- Purpose: Philippines BIR tax compliance

CREATE TABLE bir_receipt_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tin TEXT NOT NULL,                  -- Tax Identification Number
  business_name TEXT NOT NULL,
  business_address TEXT NOT NULL,
  permit_number TEXT,
  permit_date_issued DATE,
  receipt_series_start INT NOT NULL DEFAULT 1,
  receipt_series_current INT NOT NULL DEFAULT 1,
  accreditation_number TEXT,
  accreditation_date DATE,
  pos_machine_id TEXT,
  terminal_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rollback:
-- DROP TABLE IF EXISTS bir_receipt_config;
