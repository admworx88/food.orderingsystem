-- Fix submit_shift: replace auth.uid() with explicit p_cashier_id parameter.
-- The service calls this via the admin (service-role) client, so auth.uid()
-- is always NULL and the ownership check always raises E3102.

-- Drop the old signature first (parameter count differs).
DROP FUNCTION IF EXISTS submit_shift(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,integer);

-- New function: ownership verified via p_cashier_id instead of auth.uid()
CREATE OR REPLACE FUNCTION submit_shift(
  p_shift_id          UUID,
  p_cashier_id        UUID,
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
  v_started_at   TIMESTAMPTZ;
  v_submitted_at TIMESTAMPTZ := now();
BEGIN
  SELECT s.started_at
    INTO v_started_at
    FROM shifts s
   WHERE s.id = p_shift_id
     AND s.cashier_id = p_cashier_id
     AND s.status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E3102: Shift not found, not yours, or already closed';
  END IF;

  UPDATE shifts
     SET status       = 'closed',
         ended_at     = v_submitted_at,
         submitted_at = v_submitted_at
   WHERE id = p_shift_id;

  INSERT INTO shift_collections (
    cashier_id, cashier_name, date, submitted_at,
    total_orders, total_revenue,
    cash_total, gcash_total, ewallet_total, card_total, refunds_total,
    shift_id, deductions_total, net_cash,
    shift_started_at, shift_ended_at
  ) VALUES (
    p_cashier_id, p_cashier_name, CURRENT_DATE, v_submitted_at,
    p_total_orders, p_gross_total,
    p_cash_total, p_gcash_total, p_ewallet_total, p_card_total, p_refunds_total,
    p_shift_id, p_deductions_total, p_net_cash,
    v_started_at, v_submitted_at
  );

  RETURN v_submitted_at;
END;
$$;

-- Rollback:
-- DROP FUNCTION IF EXISTS submit_shift(uuid,uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,integer);
