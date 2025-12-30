import { logger } from '../../utils/logger';

interface CacheEntry {
  response: string;
  timestamp: number;
  queryHash: string;
  queryType?: string;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

// In-memory cache (fast access)
const memoryCache = new Map<string, CacheEntry>();

// Cache configuration
const CACHE_CONFIG = {
  MAX_MEMORY_SIZE: 100, // Maximum entries in memory cache
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes default
  KB_TTL: 30 * 60 * 1000, // 30 minutes for KB responses (more stable)
  API_TTL: 10 * 60 * 1000, // 10 minutes for API responses
  GREETING_TTL: 15 * 60 * 1000, // 15 minutes for greetings (very stable)
  GENERAL_TTL: 5 * 60 * 1000, // 5 minutes for general queries
  STORAGE_KEY: 'chatbot_cache',
  STORAGE_VERSION: 1,
};

// Cache statistics
const stats: CacheStats = {
  hits: 0,
  misses: 0,
  size: 0,
  evictions: 0,
};

/**
 * Generate a hash for a query (simple but effective)
 */
function hashQuery(query: string, role?: string, context?: any): string {
  const normalized = query.trim().toLowerCase();
  const roleStr = role || 'anonymous';
  const contextStr = context ? JSON.stringify(context) : '';
  const combined = `${normalized}::${roleStr}::${contextStr}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `cb_${Math.abs(hash).toString(36)}`;
}

/**
 * Get TTL based on query type
 */
function getTTL(queryType?: string): number {
  switch (queryType) {
    case 'greeting':
      return CACHE_CONFIG.GREETING_TTL;
    case 'erp':
      return CACHE_CONFIG.KB_TTL; // ERP queries often have stable answers
    case 'general':
      return CACHE_CONFIG.GENERAL_TTL;
    default:
      return CACHE_CONFIG.DEFAULT_TTL;
  }
}

/**
 * Check if cache entry is still valid
 */
function isValid(entry: CacheEntry): boolean {
  const age = Date.now() - entry.timestamp;
  return age < entry.ttl;
}

/**
 * Evict oldest entries when cache is full (LRU-like)
 */
function evictIfNeeded(): void {
  if (memoryCache.size < CACHE_CONFIG.MAX_MEMORY_SIZE) {
    return;
  }

  // Sort by timestamp (oldest first)
  const entries = Array.from(memoryCache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  // Remove oldest 20% of entries
  const toRemove = Math.ceil(entries.length * 0.2);
  for (let i = 0; i < toRemove; i++) {
    memoryCache.delete(entries[i][0]);
    stats.evictions++;
  }

  logger.debug(`[ChatbotCache] Evicted ${toRemove} entries, cache size: ${memoryCache.size}`);
}

/**
 * Load cache from localStorage on initialization
 */
function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
    if (!stored) return;

    const data = JSON.parse(stored);
    if (data.version !== CACHE_CONFIG.STORAGE_VERSION) {
      // Version mismatch, clear old cache
      localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
      return;
    }

    const entries = data.entries || [];
    let loaded = 0;

    for (const entry of entries) {
      // Only load valid entries
      if (isValid(entry)) {
        memoryCache.set(entry.queryHash, entry);
        loaded++;
      }
    }

    stats.size = memoryCache.size;
    logger.debug(`[ChatbotCache] Loaded ${loaded} valid entries from localStorage`);
  } catch (error) {
    logger.warn('[ChatbotCache] Failed to load cache from localStorage:', error);
    // Clear corrupted cache
    try {
      localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Save cache to localStorage (persist important entries)
 */
function saveToStorage(): void {
  try {
    // Only save entries that are still valid and important (KB responses, greetings)
    const importantEntries = Array.from(memoryCache.values())
      .filter(entry => isValid(entry) && (entry.queryType === 'greeting' || entry.queryType === 'erp'))
      .slice(0, 50); // Limit to 50 most important entries

    const data = {
      version: CACHE_CONFIG.STORAGE_VERSION,
      entries: importantEntries,
      timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.warn('[ChatbotCache] Failed to save cache to localStorage:', error);
  }
}

/**
 * Get cached response if available
 */
export function getCachedResponse(
  query: string,
  role?: string,
  context?: any
): string | null {
  const queryHash = hashQuery(query, role, context);
  const entry = memoryCache.get(queryHash);

  if (!entry) {
    stats.misses++;
    return null;
  }

  if (!isValid(entry)) {
    // Expired, remove it
    memoryCache.delete(queryHash);
    stats.misses++;
    stats.size = memoryCache.size;
    return null;
  }

  stats.hits++;
  logger.debug(`[ChatbotCache] Cache HIT for query: ${query.substring(0, 50)}...`);
  return entry.response;
}

/**
 * Cache a response
 */
export function cacheResponse(
  query: string,
  response: string,
  role?: string,
  context?: any,
  queryType?: string
): void {
  // Don't cache empty or error responses
  if (!response || response.trim().length === 0) {
    return;
  }

  // Don't cache very long responses (likely errors or unusual content)
  if (response.length > 5000) {
    logger.debug('[ChatbotCache] Skipping cache for very long response');
    return;
  }

  const queryHash = hashQuery(query, role, context);
  const ttl = getTTL(queryType);

  const entry: CacheEntry = {
    response: response.trim(),
    timestamp: Date.now(),
    queryHash,
    queryType,
    ttl,
  };

  evictIfNeeded();
  memoryCache.set(queryHash, entry);
  stats.size = memoryCache.size;

  // Persist important entries
  if (queryType === 'greeting' || queryType === 'erp') {
    saveToStorage();
  }

  logger.debug(`[ChatbotCache] Cached response for query type: ${queryType || 'unknown'}`);
}

/**
 * Clear cache (useful for testing or manual invalidation)
 */
export function clearCache(): void {
  memoryCache.clear();
  stats.size = 0;
  stats.hits = 0;
  stats.misses = 0;
  stats.evictions = 0;

  try {
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
  } catch {
    // Ignore
  }

  logger.debug('[ChatbotCache] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  // Clean expired entries
  let cleaned = 0;
  for (const [key, entry] of memoryCache.entries()) {
    if (!isValid(entry)) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  stats.size = memoryCache.size;

  if (cleaned > 0) {
    logger.debug(`[ChatbotCache] Cleaned ${cleaned} expired entries`);
  }

  const hitRate = stats.hits + stats.misses > 0
    ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
    : '0.00';

  return {
    ...stats,
    hitRate: `${hitRate}%`,
  } as any;
}

/**
 * Invalidate cache entries matching a pattern (useful for updates)
 */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    clearCache();
    return;
  }

  const normalizedPattern = pattern.toLowerCase();
  let invalidated = 0;

  for (const [key, entry] of memoryCache.entries()) {
    // Check if query hash or response contains pattern
    if (entry.response.toLowerCase().includes(normalizedPattern) ||
        key.includes(normalizedPattern)) {
      memoryCache.delete(key);
      invalidated++;
    }
  }

  stats.size = memoryCache.size;
  logger.debug(`[ChatbotCache] Invalidated ${invalidated} entries matching pattern: ${pattern}`);
}

// Initialize: Load from localStorage on module load
if (typeof window !== 'undefined') {
  loadFromStorage();
  
  // Save to storage periodically (every 5 minutes)
  setInterval(() => {
    saveToStorage();
  }, 5 * 60 * 1000);
  
  // Clean expired entries periodically (every 10 minutes)
  setInterval(() => {
    let cleaned = 0;
    for (const [key, entry] of memoryCache.entries()) {
      if (!isValid(entry)) {
        memoryCache.delete(key);
        cleaned++;
      }
    }
    stats.size = memoryCache.size;
    if (cleaned > 0) {
      logger.debug(`[ChatbotCache] Periodic cleanup: removed ${cleaned} expired entries`);
    }
  }, 10 * 60 * 1000);
}
