-- Migration: cashier_shifts
-- Creates shifts, shift_deductions tables; extends shift_collections;
-- adds RLS policies; adds get_shift_payments() and submit_shift() functions.

-- ============================================================
-- 1. shifts table
-- ============================================================
CREATE TABLE shifts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at   TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  status     TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes      TEXT
);

CREATE INDEX shifts_cashier_status_idx ON shifts(cashier_id, status);
CREATE INDEX shifts_started_at_idx     ON shifts(started_at DESC);

-- One open shift per cashier at DB level
CREATE UNIQUE INDEX shifts_one_open_per_cashier ON shifts(cashier_id) WHERE (status = 'open');

-- ============================================================
-- 2. shift_deductions table
-- ============================================================
CREATE TABLE shift_deductions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id    UUID        NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX shift_deductions_shift_id_idx ON shift_deductions(shift_id);

-- ============================================================
-- 3. ALTER shift_collections — drop old unique, add new columns
-- ============================================================
ALTER TABLE shift_collections
  DROP CONSTRAINT IF EXISTS shift_collections_cashier_id_date_key,
  ADD COLUMN IF NOT EXISTS shift_id          UUID        UNIQUE REFERENCES shifts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS deductions_total  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_cash          NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shift_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shift_ended_at    TIMESTAMPTZ;

-- ============================================================
-- 4. RLS — shifts
-- ============================================================
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shifts_self" ON shifts
  FOR ALL TO authenticated
  USING (cashier_id = auth.uid())
  WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "shifts_admin_read" ON shifts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 5. RLS — shift_deductions
-- ============================================================
ALTER TABLE shift_deductions ENABLE ROW LEVEL SECURITY;

-- Cashier can manage their own shift's deductions only while shift is open
CREATE POLICY "shift_deductions_self" ON shift_deductions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_id AND s.cashier_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_id AND s.cashier_id = auth.uid() AND s.status = 'open'
    )
  );

CREATE POLICY "shift_deductions_admin_read" ON shift_deductions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 6. Function: get_shift_payments
-- ============================================================
CREATE OR REPLACE FUNCTION get_shift_payments(p_shift_id UUID)
RETURNS TABLE (
  id           UUID,
  order_id     UUID,
  method       TEXT,
  amount       NUMERIC,
  status       TEXT,
  completed_at TIMESTAMPTZ,
  order_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cashier_id UUID;
  v_started_at TIMESTAMPTZ;
  v_ended_at   TIMESTAMPTZ;
BEGIN
  SELECT s.cashier_id, s.started_at, s.ended_at
    INTO v_cashier_id, v_started_at, v_ended_at
    FROM shifts s
   WHERE s.id = p_shift_id AND s.cashier_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found or access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.order_id,
    p.method::TEXT,
    p.amount,
    p.status::TEXT,
    p.completed_at,
    o.order_number
  FROM payments p
  JOIN orders o ON o.id = p.order_id
  WHERE p.processed_by = v_cashier_id
    AND p.completed_at >= v_started_at
    AND p.completed_at <= COALESCE(v_ended_at, now());
END;
$$;

-- ============================================================
-- 7. Function: submit_shift (atomic submit)
-- ============================================================
CREATE OR REPLACE FUNCTION submit_shift(
  p_shift_id          UUID,
  p_cashier_name      TEXT,
  p_gross_total       NUMERIC,
  p_cash_total        NUMERIC,
  p_gcash_total       NUMERIC,
  p_ewallet_total     NUMERIC,
  p_card_total        NUMERIC,
  p_refunds_total     NUMERIC,
  p_deductions_total  NUMERIC,
  p_net_cash          NUMERIC,
  p_total_orders      INTEGER
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cashier_id   UUID;
  v_started_at   TIMESTAMPTZ;
  v_submitted_at TIMESTAMPTZ := now();
BEGIN
  -- Verify ownership + open status
  SELECT s.cashier_id, s.started_at
    INTO v_cashier_id, v_started_at
    FROM shifts s
   WHERE s.id = p_shift_id
     AND s.cashier_id = auth.uid()
     AND s.status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E3102: Shift not found, not yours, or already closed';
  END IF;

  -- Close the shift
  UPDATE shifts
     SET status       = 'closed',
         ended_at     = v_submitted_at,
         submitted_at = v_submitted_at
   WHERE id = p_shift_id;

  -- Snapshot into shift_collections
  INSERT INTO shift_collections (
    cashier_id, cashier_name, date, submitted_at,
    total_orders, total_revenue,
    cash_total, gcash_total, ewallet_total, card_total, refunds_total,
    shift_id, deductions_total, net_cash,
    shift_started_at, shift_ended_at
  ) VALUES (
    v_cashier_id, p_cashier_name, CURRENT_DATE, v_submitted_at,
    p_total_orders, p_gross_total,
    p_cash_total, p_gcash_total, p_ewallet_total, p_card_total, p_refunds_total,
    p_shift_id, p_deductions_total, p_net_cash,
    v_started_at, v_submitted_at
  );

  RETURN v_submitted_at;
END;
$$;

-- ============================================================
-- Rollback:
-- DROP FUNCTION IF EXISTS submit_shift(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,integer);
-- DROP FUNCTION IF EXISTS get_shift_payments(uuid);
-- ALTER TABLE shift_collections DROP COLUMN IF EXISTS shift_ended_at, DROP COLUMN IF EXISTS shift_started_at, DROP COLUMN IF EXISTS net_cash, DROP COLUMN IF EXISTS deductions_total, DROP COLUMN IF EXISTS shift_id;
-- ALTER TABLE shift_collections ADD CONSTRAINT shift_collections_cashier_id_date_key UNIQUE (cashier_id, date);
-- DROP TABLE IF EXISTS shift_deductions;
-- DROP TABLE IF EXISTS shifts;
-- ============================================================
