-- Add remittance_number to shift_collections.
-- Format: YYYY-NN (global sequential per calendar year, zero-padded to 2 digits).
-- Auto-assigned via BEFORE INSERT trigger.

ALTER TABLE shift_collections
  ADD COLUMN IF NOT EXISTS remittance_number TEXT;

-- Function: returns next remittance number for the current year
CREATE OR REPLACE FUNCTION get_next_remittance_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  v_seq  INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(remittance_number, '-', 2) AS INT)), 0) + 1
    INTO v_seq
    FROM shift_collections
   WHERE remittance_number LIKE v_year || '-%';

  RETURN v_year || '-' || LPAD(v_seq::TEXT, 2, '0');
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION trg_assign_remittance_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.remittance_number IS NULL THEN
    NEW.remittance_number := get_next_remittance_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_remittance_number ON shift_collections;
CREATE TRIGGER set_remittance_number
  BEFORE INSERT ON shift_collections
  FOR EACH ROW EXECUTE FUNCTION trg_assign_remittance_number();

-- Backfill existing rows in submitted_at order
DO $$
DECLARE
  rec  RECORD;
  v_year TEXT;
  v_seq  INT;
BEGIN
  FOR rec IN
    SELECT id, submitted_at FROM shift_collections
    WHERE remittance_number IS NULL
    ORDER BY submitted_at ASC
  LOOP
    v_year := EXTRACT(YEAR FROM rec.submitted_at)::TEXT;
    SELECT COALESCE(MAX(CAST(SPLIT_PART(remittance_number, '-', 2) AS INT)), 0) + 1
      INTO v_seq
      FROM shift_collections
     WHERE remittance_number LIKE v_year || '-%';

    UPDATE shift_collections
       SET remittance_number = v_year || '-' || LPAD(v_seq::TEXT, 2, '0')
     WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Rollback:
-- DROP TRIGGER IF EXISTS set_remittance_number ON shift_collections;
-- DROP FUNCTION IF EXISTS trg_assign_remittance_number();
-- DROP FUNCTION IF EXISTS get_next_remittance_number();
-- ALTER TABLE shift_collections DROP COLUMN IF EXISTS remittance_number;
