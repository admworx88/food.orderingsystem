-- Migration: Update process_cash_payment to support bill_later orders
-- Bill later orders can be paid when they're in preparing, ready, or served status

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
  v_is_bill_later BOOLEAN;
  v_valid_bill_later_status BOOLEAN;
BEGIN
  -- Lock the order row to prevent concurrent payment attempts
  SELECT id, status, payment_status, payment_method, total_amount, expires_at, deleted_at, version
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

  -- Check if this is a bill_later order
  v_is_bill_later := v_order.payment_method = 'bill_later';
  v_valid_bill_later_status := v_order.status IN ('preparing', 'ready', 'served');

  -- Validate order is eligible for payment
  IF v_order.payment_status != 'unpaid' THEN
    RAISE EXCEPTION 'E3007: Order is already paid' USING ERRCODE = 'P0001';
  END IF;

  -- For regular orders, must be in pending_payment status
  IF NOT v_is_bill_later AND v_order.status != 'pending_payment' THEN
    RAISE EXCEPTION 'E3007: Order is not pending payment' USING ERRCODE = 'P0001';
  END IF;

  -- For bill_later orders, must be in preparing/ready/served status
  IF v_is_bill_later AND NOT v_valid_bill_later_status THEN
    RAISE EXCEPTION 'E3007: Bill later order is not ready for payment' USING ERRCODE = 'P0001';
  END IF;

  -- Validate order has not expired (only for non-bill-later orders)
  IF NOT v_is_bill_later AND v_order.expires_at IS NOT NULL AND v_order.expires_at < NOW() THEN
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
  -- For bill_later orders that are served, keep them as served
  -- For other orders, set to paid
  IF v_is_bill_later AND v_order.status = 'served' THEN
    UPDATE orders
    SET payment_status = 'paid',
        payment_method = 'cash',
        paid_at = NOW(),
        updated_at = NOW(),
        version = COALESCE(version, 0) + 1
    WHERE id = p_order_id;
  ELSE
    UPDATE orders
    SET status = 'paid',
        payment_status = 'paid',
        payment_method = 'cash',
        paid_at = NOW(),
        updated_at = NOW(),
        version = COALESCE(version, 0) + 1
    WHERE id = p_order_id;
  END IF;

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
      'change_given', p_change_given,
      'was_bill_later', v_is_bill_later
    ),
    p_cashier_id
  );

  RETURN v_payment_id;
END;
$$;

-- Rollback:
-- DROP FUNCTION IF EXISTS process_cash_payment(UUID, NUMERIC, NUMERIC, NUMERIC, UUID);
-- Then re-create the original version from 20260209000001_payment_rpc_functions.sql:
-- CREATE OR REPLACE FUNCTION process_cash_payment(
--   p_order_id UUID,
--   p_amount NUMERIC,
--   p_cash_received NUMERIC,
--   p_change_given NUMERIC,
--   p_cashier_id UUID
-- )
-- RETURNS UUID
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- DECLARE
--   v_order RECORD;
--   v_payment_id UUID;
-- BEGIN
--   SELECT id, status, payment_status, total_amount, expires_at, deleted_at, version
--   INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
--   IF NOT FOUND THEN
--     RAISE EXCEPTION 'E2001: Order not found' USING ERRCODE = 'P0001';
--   END IF;
--   IF v_order.deleted_at IS NOT NULL THEN
--     RAISE EXCEPTION 'E2001: Order not found' USING ERRCODE = 'P0001';
--   END IF;
--   IF v_order.status != 'pending_payment' OR v_order.payment_status != 'unpaid' THEN
--     RAISE EXCEPTION 'E3007: Order is not pending payment' USING ERRCODE = 'P0001';
--   END IF;
--   IF v_order.expires_at IS NOT NULL AND v_order.expires_at < NOW() THEN
--     UPDATE orders SET status = 'cancelled', payment_status = 'expired',
--       cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
--     RAISE EXCEPTION 'E2003: Order has expired' USING ERRCODE = 'P0001';
--   END IF;
--   IF p_amount != v_order.total_amount THEN
--     RAISE EXCEPTION 'E3003: Payment amount does not match order total' USING ERRCODE = 'P0001';
--   END IF;
--   IF p_cash_received < v_order.total_amount THEN
--     RAISE EXCEPTION 'E3005: Insufficient cash tendered' USING ERRCODE = 'P0001';
--   END IF;
--   INSERT INTO payments (order_id, method, amount, cash_received, change_given, status, processed_by, completed_at)
--   VALUES (p_order_id, 'cash', p_amount, p_cash_received, p_change_given, 'success', p_cashier_id, NOW())
--   RETURNING id INTO v_payment_id;
--   UPDATE orders SET status = 'paid', payment_status = 'paid', payment_method = 'cash',
--     paid_at = NOW(), updated_at = NOW(), version = COALESCE(version, 0) + 1
--   WHERE id = p_order_id;
--   INSERT INTO order_events (order_id, event_type, event_data, created_by)
--   VALUES (p_order_id, 'payment_received', jsonb_build_object(
--     'payment_id', v_payment_id, 'method', 'cash', 'amount', p_amount,
--     'cash_received', p_cash_received, 'change_given', p_change_given
--   ), p_cashier_id);
--   RETURN v_payment_id;
-- END;
-- $$;
-- GRANT EXECUTE ON FUNCTION process_cash_payment(UUID, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated;
