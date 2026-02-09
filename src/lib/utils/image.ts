/**
 * Image utility functions for handling Supabase storage images
 */

/**
 * Normalizes image URLs to use consistent hostname
 * Converts 127.0.0.1 to localhost for Next.js Image optimization compatibility
 *
 * @param url - The image URL from database
 * @returns Normalized URL with localhost hostname
 */
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    // Replace 127.0.0.1 with localhost for consistency
    // Next.js Image component works better with localhost in development
    return url.replace('http://127.0.0.1:', 'http://localhost:');
  } catch (error) {
    console.error('Error normalizing image URL:', error);
    return url;
  }
}

/**
 * Checks if an image URL is from local Supabase storage
 *
 * @param url - The image URL to check
 * @returns true if URL is from local Supabase instance
 */
export function isLocalSupabaseImage(url: string | null | undefined): boolean {
  if (!url) return false;

  return url.includes('localhost:54321') || url.includes('127.0.0.1:54321');
}

/**
 * Gets an optimized image URL for display
 * Handles both local and production Supabase URLs
 *
 * @param url - The image URL from database
 * @returns Optimized URL for display
 */
export function getOptimizedImageUrl(url: string | null | undefined): string | null {
  const normalized = normalizeImageUrl(url);
  return normalized;
}
