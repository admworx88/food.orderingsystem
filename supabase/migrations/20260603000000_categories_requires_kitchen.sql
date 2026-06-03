-- Add requires_kitchen flag to categories
-- false = item is prepared outside the kitchen (e.g. beverages, soft drinks)
-- true  = item goes to the kitchen for preparation (default)

ALTER TABLE categories
  ADD COLUMN requires_kitchen boolean NOT NULL DEFAULT true;

-- Set non-kitchen categories based on common name patterns
UPDATE categories
SET requires_kitchen = false
WHERE LOWER(name) SIMILAR TO
  '%(beverage|beverages|drink|drinks|juice|juices|soda|sodas|water|coffee|tea|soft drink|soft drinks|smoothie|smoothies|beer|wine|cocktail|cocktails|shake|shakes|milkshake|milkshakes|iced|frappe|frappes)%';

-- Rollback:
-- ALTER TABLE categories DROP COLUMN requires_kitchen;
