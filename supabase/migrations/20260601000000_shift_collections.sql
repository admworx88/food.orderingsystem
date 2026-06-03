-- Migration: shift_collections
-- Stores end-of-shift collection submissions per cashier per day.
-- Required before a cashier can sign out.

CREATE TABLE IF NOT EXISTS shift_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cashier_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  cash_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  gcash_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  ewallet_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  card_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  refunds_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE (cashier_id, date)
);

ALTER TABLE shift_collections ENABLE ROW LEVEL SECURITY;

-- Cashiers can read and write their own records
CREATE POLICY "shift_collections_self" ON shift_collections
  FOR ALL TO authenticated
  USING (cashier_id = auth.uid())
  WITH CHECK (cashier_id = auth.uid());

-- Admins can read all records
CREATE POLICY "shift_collections_admin_read" ON shift_collections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Rollback:
-- DROP TABLE IF EXISTS shift_collections;
