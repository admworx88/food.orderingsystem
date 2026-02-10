-- Migration: Fix process_cash_payment to use correct order_events columns
-- Created: 2026-02-11 12:00:00
-- Purpose: Fix column reference bug - order_events uses 'metadata' not 'event_data' or 'created_by'
--
-- Bug introduced in 20260209150000_update_cash_payment_for_bill_later.sql
-- The INSERT statement used non-existent columns:
--   - event_data (should be: metadata)
--   - created_by (column doesn't exist - cashier_id should go inside metadata JSONB)

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
  -- FIX: Use correct column name 'metadata' (not 'event_data')
  -- FIX: Include cashier_id inside metadata (no 'created_by' column exists)
  INSERT INTO order_events (order_id, event_type, metadata)
  VALUES (
    p_order_id,
    'payment_received',
    jsonb_build_object(
      'payment_id', v_payment_id,
      'method', 'cash',
      'amount', p_amount,
      'cash_received', p_cash_received,
      'change_given', p_change_given,
      'was_bill_later', v_is_bill_later,
      'cashier_id', p_cashier_id
    )
  );

  RETURN v_payment_id;
END;
$$;

-- Rollback:
-- To rollback, restore the previous (buggy) version from 20260209150000
-- However, since that version has a bug, you'd need to fix it manually
-- or apply the fix migration again after rolling back other changes.
