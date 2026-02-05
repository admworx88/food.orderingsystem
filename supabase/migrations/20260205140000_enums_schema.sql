-- Migration: Create enum types
-- Created: 2026-02-05 14:00:00
-- Purpose: Define all enum types for the system

CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'kitchen', 'kiosk');
CREATE TYPE order_type AS ENUM ('dine_in', 'room_service', 'takeout');
CREATE TYPE order_status AS ENUM (
  'pending_payment', 'paid', 'preparing', 'ready', 'served', 'cancelled'
);
CREATE TYPE payment_status AS ENUM ('unpaid', 'processing', 'paid', 'refunded', 'expired');
CREATE TYPE payment_method AS ENUM ('cash', 'gcash', 'card');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- Rollback:
-- DROP TYPE IF EXISTS discount_type;
-- DROP TYPE IF EXISTS payment_method;
-- DROP TYPE IF EXISTS payment_status;
-- DROP TYPE IF EXISTS order_status;
-- DROP TYPE IF EXISTS order_type;
-- DROP TYPE IF EXISTS user_role;
