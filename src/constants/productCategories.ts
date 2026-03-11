/** Default product categories shown in add/edit product forms */
export const DEFAULT_PRODUCT_CATEGORIES = [
  'Electronics',
  'Mechanical tools',
  'Clothing',
  'Accessories',
  'Home appliances',
] as const;

export type DefaultProductCategory = (typeof DEFAULT_PRODUCT_CATEGORIES)[number];

const STORAGE_KEY = 'productCustomCategories';

export function getCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function setCustomCategories(categories: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

export function addCustomCategory(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getCustomCategories();
  const current = getCustomCategories();
  if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return current;
  const next = [...current, trimmed];
  setCustomCategories(next);
  return next;
}

export function removeCustomCategory(name: string): string[] {
  const current = getCustomCategories();
  const next = current.filter((c) => c !== name);
  setCustomCategories(next);
  return next;
}
