/**
 * Allergen and Nutritional Info Constants
 * Used in admin menu item form and kiosk item display
 */

export interface AllergenOption {
  value: string;
  label: string;
  icon: string;
}

export const ALLERGEN_OPTIONS: AllergenOption[] = [
  { value: 'gluten', label: 'Gluten', icon: '🌾' },
  { value: 'dairy', label: 'Dairy', icon: '🥛' },
  { value: 'nuts', label: 'Nuts', icon: '🥜' },
  { value: 'eggs', label: 'Eggs', icon: '🥚' },
  { value: 'soy', label: 'Soy', icon: '🫘' },
  { value: 'shellfish', label: 'Shellfish', icon: '🦐' },
  { value: 'fish', label: 'Fish', icon: '🐟' },
  { value: 'sesame', label: 'Sesame', icon: '🌱' },
  { value: 'wheat', label: 'Wheat', icon: '🌿' },
];

export interface NutritionalField {
  key: string;
  label: string;
  unit: string;
}

export const NUTRITIONAL_FIELDS: NutritionalField[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
];

/** Type for the nutritional_info JSON stored in the database */
export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}
