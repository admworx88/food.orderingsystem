-- Add ocean_view to order_type enum
ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'ocean_view';

-- ROLLBACK: Cannot remove enum values in Postgres without recreating the type.
-- To rollback: recreate enum without ocean_view and migrate any rows away from it first.
