-- Migration: Re-insert menu categories using idempotent upsert
-- Fixes the original destructive DELETE FROM categories approach.
-- Uses ON CONFLICT (slug) DO UPDATE to preserve existing categories
-- and any menu_items referencing them via foreign key.

INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
  -- Breakfast & All-Day
  ('Breakfast', 'breakfast', 'Start your day right with our breakfast selections', 1, true),
  ('All-Day Breakfast', 'all-day-breakfast', 'Breakfast favorites available anytime', 2, true),

  -- Filipino Specialties
  ('Silog Meals', 'silog-meals', 'Classic Filipino breakfast combos with garlic rice and egg', 3, true),
  ('Filipino Favorites', 'filipino-favorites', 'Traditional Filipino dishes and home-style cooking', 4, true),
  ('Grilled & BBQ', 'grilled-bbq', 'Charcoal-grilled meats and seafood', 5, true),

  -- Starters & Appetizers
  ('Appetizers', 'appetizers', 'Small plates and finger foods to start your meal', 6, true),
  ('Soups', 'soups', 'Hot soups and traditional broths', 7, true),
  ('Salads', 'salads', 'Fresh greens and healthy options', 8, true),

  -- Main Courses
  ('Rice Meals', 'rice-meals', 'Complete rice meal combos', 9, true),
  ('Chicken', 'chicken', 'Chicken dishes prepared various ways', 10, true),
  ('Pork', 'pork', 'Savory pork dishes and specialties', 11, true),
  ('Beef', 'beef', 'Premium beef selections', 12, true),
  ('Seafood', 'seafood', 'Fresh catches from the sea', 13, true),
  ('Pasta & Noodles', 'pasta-noodles', 'Italian pastas and Asian noodle dishes', 14, true),
  ('Vegetarian', 'vegetarian', 'Plant-based and vegetable dishes', 15, true),

  -- Sides & Extras
  ('Side Dishes', 'side-dishes', 'Perfect accompaniments to your meal', 16, true),
  ('Rice Varieties', 'rice-varieties', 'Plain, garlic, java, and specialty rice', 17, true),
  ('Extra Toppings', 'extra-toppings', 'Add-ons and extras', 18, true),

  -- Beverages
  ('Hot Beverages', 'hot-beverages', 'Coffee, tea, and hot chocolate', 19, true),
  ('Cold Beverages', 'cold-beverages', 'Refreshing cold drinks and shakes', 20, true),
  ('Fresh Juices', 'fresh-juices', 'Freshly squeezed fruit juices', 21, true),
  ('Soft Drinks', 'soft-drinks', 'Sodas and carbonated drinks', 22, true),

  -- Desserts & Sweets
  ('Desserts', 'desserts', 'Sweet treats to end your meal', 23, true),
  ('Filipino Desserts', 'filipino-desserts', 'Traditional Filipino sweets and kakanin', 24, true),
  ('Ice Cream', 'ice-cream', 'Frozen desserts and sundaes', 25, true),

  -- Special Categories
  ('Chef''s Specials', 'chefs-specials', 'Signature dishes by our executive chef', 26, true),
  ('Seasonal Items', 'seasonal-items', 'Limited-time offerings with seasonal ingredients', 27, true),
  ('Kids Menu', 'kids-menu', 'Child-friendly portions and favorites', 28, true),
  ('Healthy Options', 'healthy-options', 'Low-calorie and nutritious choices', 29, true),

  -- Room Service Specific
  ('Quick Bites', 'quick-bites', 'Fast and easy snacks for any time', 30, true),
  ('Late Night', 'late-night', 'Available for late-night room service', 31, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- Rollback:
-- No rollback needed — upsert is safe to re-run.
