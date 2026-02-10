-- Migration: Add waiter role and bill_later payment method
-- Created: 2026-02-09 14:01:00
-- Purpose: Support waiter staff and "pay after eating" workflow

-- Add waiter role to user_role enum
ALTER TYPE user_role ADD VALUE 'waiter';

-- Add bill_later payment method for dine-in orders
ALTER TYPE payment_method ADD VALUE 'bill_later';

-- Note: Enum values cannot be removed in PostgreSQL, only added.
-- If rollback is needed, these values will remain in the enum but won't be used.

-- Rollback:
-- Note: PostgreSQL does not support DROP VALUE for enums.
-- The values 'waiter' and 'bill_later' will remain but can be ignored.
-- If a full rollback is needed, you would need to:
-- 1. Update all rows using these values to another value
-- 2. Recreate the enum types without these values
-- 3. Update all dependent tables and functions
