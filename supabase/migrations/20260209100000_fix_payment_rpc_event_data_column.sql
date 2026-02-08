-- Migration: Fix process_cash_payment RPC function
-- Bug: Used non-existent columns 'event_data' and 'created_by' on order_events table
-- Fix: Replace with correct column name 'metadata' and remove 'created_by'

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

  -- Log the payment event (fixed: use 'metadata' column, not 'event_data')
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
      'cashier_id', p_cashier_id
    )
  );

  RETURN v_payment_id;
END;
$$;

-- Rollback:
-- This is a CREATE OR REPLACE, so rolling back means re-applying the original
-- (buggy) function from 20260209000001_payment_rpc_functions.sql
