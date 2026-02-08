-- Migration: Add RPC functions for payment processing
-- 1. process_cash_payment — atomic cash payment with order status update
-- 2. cancel_expired_orders — bulk cancel unpaid orders past expires_at
-- 3. get_next_bir_receipt_number — sequential receipt number with row lock

-- ============================================================
-- 1. Process Cash Payment (atomic transaction)
-- ============================================================
CREATE OR REPLACE FUNCTION process_cash_payment(
  p_order_id UUID,
  p_amount NUMERIC,
  p_cash_received NUMERIC,
  p_change_given NUMERIC,
  p_cashier_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_payment_id UUID;
BEGIN
  -- Lock the order row to prevent concurrent payment attempts
  SELECT id, status, payment_status, total_amount, expires_at, deleted_at, version
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  -- Validate order exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E2001: Order not found' USING ERRCODE = 'P0001';
  END IF;

  -- Validate order is not soft-deleted
  IF v_order.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'E2001: Order not found' USING ERRCODE = 'P0001';
  END IF;

  -- Validate order is pending payment
  IF v_order.status != 'pending_payment' OR v_order.payment_status != 'unpaid' THEN
    RAISE EXCEPTION 'E3007: Order is not pending payment' USING ERRCODE = 'P0001';
  END IF;

  -- Validate order has not expired
  IF v_order.expires_at IS NOT NULL AND v_order.expires_at < NOW() THEN
    -- Auto-cancel the expired order
    UPDATE orders
    SET status = 'cancelled',
        payment_status = 'expired',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    RAISE EXCEPTION 'E2003: Order has expired' USING ERRCODE = 'P0001';
  END IF;

  -- Validate amount matches order total
  IF p_amount != v_order.total_amount THEN
    RAISE EXCEPTION 'E3003: Payment amount does not match order total' USING ERRCODE = 'P0001';
  END IF;

  -- Validate cash received is sufficient
  IF p_cash_received < v_order.total_amount THEN
    RAISE EXCEPTION 'E3005: Insufficient cash tendered' USING ERRCODE = 'P0001';
  END IF;

  -- Insert payment record
  INSERT INTO payments (
    order_id,
    method,
    amount,
    cash_received,
    change_given,
    status,
    processed_by,
    completed_at
  ) VALUES (
    p_order_id,
    'cash',
    p_amount,
    p_cash_received,
    p_change_given,
    'success',
    p_cashier_id,
    NOW()
  )
  RETURNING id INTO v_payment_id;

  -- Update order status to paid
  UPDATE orders
  SET status = 'paid',
      payment_status = 'paid',
      payment_method = 'cash',
      paid_at = NOW(),
      updated_at = NOW(),
      version = COALESCE(version, 0) + 1
  WHERE id = p_order_id;

  -- Log the payment event
  INSERT INTO order_events (order_id, event_type, event_data, created_by)
  VALUES (
    p_order_id,
    'payment_received',
    jsonb_build_object(
      'payment_id', v_payment_id,
      'method', 'cash',
      'amount', p_amount,
      'cash_received', p_cash_received,
      'change_given', p_change_given
    ),
    p_cashier_id
  );

  RETURN v_payment_id;
END;
$$;

-- ============================================================
-- 2. Cancel Expired Orders (bulk operation)
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_expired_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE orders
    SET status = 'cancelled',
        payment_status = 'expired',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE payment_status = 'unpaid'
      AND status = 'pending_payment'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
      AND deleted_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

-- ============================================================
-- 3. Get Next BIR Receipt Number (with row lock)
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_bir_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_next_number INTEGER;
  v_receipt_number TEXT;
BEGIN
  -- Lock the config row to prevent concurrent receipt number allocation
  SELECT id, receipt_series_current, receipt_series_start
  INTO v_config
  FROM bir_receipt_config
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E9001: BIR receipt configuration not found' USING ERRCODE = 'P0001';
  END IF;

  -- Increment the current number
  v_next_number := v_config.receipt_series_current + 1;

  -- Update the config with new current number
  UPDATE bir_receipt_config
  SET receipt_series_current = v_next_number,
      updated_at = NOW()
  WHERE id = v_config.id;

  -- Format as zero-padded 8-digit number
  v_receipt_number := LPAD(v_next_number::TEXT, 8, '0');

  RETURN v_receipt_number;
END;
$$;

-- ============================================================
-- Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION process_cash_payment(UUID, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_expired_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_bir_receipt_number() TO authenticated;

-- Rollback:
-- DROP FUNCTION IF EXISTS process_cash_payment(UUID, NUMERIC, NUMERIC, NUMERIC, UUID);
-- DROP FUNCTION IF EXISTS cancel_expired_orders();
-- DROP FUNCTION IF EXISTS get_next_bir_receipt_number();
