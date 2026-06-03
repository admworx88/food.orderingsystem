-- Fix get_shift_payments to collect from start-of-day (PHT) instead of exact shift start.
-- This ensures all payments processed on the same calendar day are included, even if
-- the cashier started the shift after already processing some orders.

CREATE OR REPLACE FUNCTION get_shift_payments(p_shift_id uuid)
RETURNS TABLE (
  id uuid,
  order_id uuid,
  method text,
  amount numeric,
  status text,
  completed_at timestamptz,
  order_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cashier_id uuid;
  v_started_at timestamptz;
  v_ended_at  timestamptz;
  v_collection_from timestamptz;
BEGIN
  SELECT cashier_id, started_at, ended_at
  INTO v_cashier_id, v_started_at, v_ended_at
  FROM shifts
  WHERE id = p_shift_id;

  -- Collect from midnight PHT (UTC+8) of the day the shift was opened,
  -- so all of that day's payments are captured regardless of when the shift was started.
  v_collection_from := date_trunc('day', v_started_at AT TIME ZONE 'Asia/Manila')
                       AT TIME ZONE 'Asia/Manila';

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
    AND p.completed_at >= v_collection_from
    AND p.completed_at <= COALESCE(v_ended_at, now());
END;
$$;

-- Rollback:
-- Restore previous version (strict shift window):
-- CREATE OR REPLACE FUNCTION get_shift_payments(p_shift_id uuid)
-- ... WHERE p.completed_at >= v_started_at ...
