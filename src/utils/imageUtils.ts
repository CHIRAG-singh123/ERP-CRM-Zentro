/**
 * Constructs a full image URL from a relative path
 * Handles both relative paths (from server uploads) and absolute URLs
 */
export const getImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  
  // If already a full URL (http/https) or data URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // Construct full URL from relative path
  const serverBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${serverBase}${url.startsWith('/') ? url : `/${url}`}`;
};

/**
 * Constructs a full URL for 3D model (e.g. .glb) from a relative path.
 * Same as getImageUrl but named for clarity when used for model assets.
 */
export const getModel3dUrl = (url?: string | null): string | null => {
  return getImageUrl(url);
};

