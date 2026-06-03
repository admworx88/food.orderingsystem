-- Fix "column reference id is ambiguous" error in get_shift_payments.
-- RETURNS TABLE declares an output column named "id", which conflicts with the
-- unqualified "id" in "WHERE id = p_shift_id". Use table alias "s" throughout.

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
  v_cashier_id      uuid;
  v_started_at      timestamptz;
  v_ended_at        timestamptz;
  v_collection_from timestamptz;
BEGIN
  SELECT s.cashier_id, s.started_at, s.ended_at
  INTO v_cashier_id, v_started_at, v_ended_at
  FROM shifts s
  WHERE s.id = p_shift_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Collect from midnight PHT (UTC+8) of the day the shift was opened
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
    AND COALESCE(p.completed_at, p.created_at) >= v_collection_from
    AND COALESCE(p.completed_at, p.created_at) <= COALESCE(v_ended_at, now());
END;
$$;

-- Rollback: re-apply 20260603150000_fix_shift_payments_null_completed_at.sql
