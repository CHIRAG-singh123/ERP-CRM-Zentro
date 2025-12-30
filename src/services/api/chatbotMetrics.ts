import { logger } from '../../utils/logger';

interface ModelMetrics {
  modelName: string;
  tier: string;
  successCount: number;
  failureCount: number;
  totalLatency: number; // Sum of all latencies in ms
  averageLatency: number; // Average latency in ms
  lastSuccessTime?: number;
  lastFailureTime?: number;
  qualityScore: number; // 0-1, based on response quality
}

interface QueryTypeMetrics {
  queryType: string;
  totalQueries: number;
  successfulQueries: number;
  averageLatency: number;
  bestModel: string; // Model with best performance for this query type
}

// In-memory metrics storage
const modelMetrics = new Map<string, ModelMetrics>();
const queryTypeMetrics = new Map<string, QueryTypeMetrics>();

// Configuration
const METRICS_CONFIG = {
  MAX_ENTRIES: 100, // Maximum models to track
  QUALITY_THRESHOLD: 0.6, // Minimum quality score to consider good
  MIN_SAMPLES: 3, // Minimum samples before trusting metrics
};

/**
 * Get or create metrics for a model
 */
function getOrCreateModelMetrics(modelName: string, tier: string): ModelMetrics {
  const key = `${tier}:${modelName}`;
  if (!modelMetrics.has(key)) {
    modelMetrics.set(key, {
      modelName,
      tier,
      successCount: 0,
      failureCount: 0,
      totalLatency: 0,
      averageLatency: 0,
      qualityScore: 0.5, // Default neutral score
    });
  }
  return modelMetrics.get(key)!;
}

/**
 * Record a successful API call
 */
export function recordSuccess(
  modelName: string,
  tier: string,
  latency: number,
  queryType?: string,
  qualityScore?: number
): void {
  const metrics = getOrCreateModelMetrics(modelName, tier);
  metrics.successCount++;
  metrics.totalLatency += latency;
  metrics.averageLatency = metrics.totalLatency / (metrics.successCount + metrics.failureCount);
  metrics.lastSuccessTime = Date.now();
  
  if (qualityScore !== undefined) {
    // Update quality score (weighted average)
    const weight = 0.3; // How much new score affects average
    metrics.qualityScore = metrics.qualityScore * (1 - weight) + qualityScore * weight;
  }

  // Update query type metrics
  if (queryType) {
    const qtKey = queryType;
    if (!queryTypeMetrics.has(qtKey)) {
      queryTypeMetrics.set(qtKey, {
        queryType,
        totalQueries: 0,
        successfulQueries: 0,
        averageLatency: 0,
        bestModel: modelName,
      });
    }
    const qtMetrics = queryTypeMetrics.get(qtKey)!;
    qtMetrics.totalQueries++;
    qtMetrics.successfulQueries++;
    qtMetrics.averageLatency = (qtMetrics.averageLatency * (qtMetrics.totalQueries - 1) + latency) / qtMetrics.totalQueries;
    
    // Update best model if this one is better
    const currentBest = getOrCreateModelMetrics(qtMetrics.bestModel, tier);
    if (metrics.averageLatency < currentBest.averageLatency && metrics.successCount >= METRICS_CONFIG.MIN_SAMPLES) {
      qtMetrics.bestModel = modelName;
    }
  }

  logger.debug(`[ChatbotMetrics] Recorded success for ${tier}:${modelName} (latency: ${latency}ms, quality: ${qualityScore?.toFixed(2) || 'N/A'})`);
}

/**
 * Record a failed API call
 */
export function recordFailure(
  modelName: string,
  tier: string,
  error: string,
  queryType?: string
): void {
  const metrics = getOrCreateModelMetrics(modelName, tier);
  metrics.failureCount++;
  metrics.averageLatency = metrics.totalLatency / (metrics.successCount + metrics.failureCount);
  metrics.lastFailureTime = Date.now();

  // Update query type metrics
  if (queryType) {
    const qtKey = queryType;
    if (!queryTypeMetrics.has(qtKey)) {
      queryTypeMetrics.set(qtKey, {
        queryType,
        totalQueries: 0,
        successfulQueries: 0,
        averageLatency: 0,
        bestModel: modelName,
      });
    }
    const qtMetrics = queryTypeMetrics.get(qtKey)!;
    qtMetrics.totalQueries++;
  }

  logger.debug(`[ChatbotMetrics] Recorded failure for ${tier}:${modelName} (error: ${error.substring(0, 50)})`);
}

/**
 * Get best model for a query type based on metrics
 */
export function getBestModelForQueryType(
  queryType: string,
  availableModels: Array<{ tier: string; modelName: string }>
): { tier: string; modelName: string } | null {
  const qtMetrics = queryTypeMetrics.get(queryType);
  if (!qtMetrics || qtMetrics.totalQueries < METRICS_CONFIG.MIN_SAMPLES) {
    return null; // Not enough data
  }

  // Find the best model from available models
  let bestModel: { tier: string; modelName: string } | null = null;
  let bestScore = -1;

  for (const model of availableModels) {
    const key = `${model.tier}:${model.modelName}`;
    const metrics = modelMetrics.get(key);
    
    if (metrics && metrics.successCount >= METRICS_CONFIG.MIN_SAMPLES) {
      // Calculate score: success rate * quality * (1 / normalized latency)
      const successRate = metrics.successCount / (metrics.successCount + metrics.failureCount);
      const latencyScore = 1 / (1 + metrics.averageLatency / 1000); // Normalize to 0-1
      const score = successRate * metrics.qualityScore * latencyScore;

      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }
  }

  return bestModel;
}

/**
 * Get ranked models for a query type (best first)
 */
export function getRankedModels(
  _queryType: string,
  availableModels: Array<{ tier: string; modelName: string }>
): Array<{ tier: string; modelName: string; score: number }> {
  const ranked = availableModels.map(model => {
    const key = `${model.tier}:${model.modelName}`;
    const metrics = modelMetrics.get(key);

    if (!metrics || metrics.successCount + metrics.failureCount < METRICS_CONFIG.MIN_SAMPLES) {
      // Not enough data, use default score
      return { ...model, score: 0.5 };
    }

    // Calculate composite score
    const successRate = metrics.successCount / (metrics.successCount + metrics.failureCount);
    const latencyScore = 1 / (1 + metrics.averageLatency / 1000);
    const score = successRate * metrics.qualityScore * latencyScore;

    return { ...model, score };
  });

  // Sort by score (best first)
  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Get metrics for a specific model
 */
export function getModelMetrics(modelName: string, tier: string): ModelMetrics | null {
  const key = `${tier}:${modelName}`;
  return modelMetrics.get(key) || null;
}

/**
 * Get all metrics summary
 */
export function getAllMetrics(): {
  models: ModelMetrics[];
  queryTypes: QueryTypeMetrics[];
  summary: {
    totalModels: number;
    totalQueries: number;
    averageSuccessRate: number;
  };
} {
  const models = Array.from(modelMetrics.values());
  const queryTypes = Array.from(queryTypeMetrics.values());

  const totalQueries = queryTypes.reduce((sum, qt) => sum + qt.totalQueries, 0);
  const totalSuccesses = queryTypes.reduce((sum, qt) => sum + qt.successfulQueries, 0);
  const averageSuccessRate = totalQueries > 0 ? totalSuccesses / totalQueries : 0;

  return {
    models,
    queryTypes,
    summary: {
      totalModels: models.length,
      totalQueries,
      averageSuccessRate,
    },
  };
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  modelMetrics.clear();
  queryTypeMetrics.clear();
  logger.debug('[ChatbotMetrics] All metrics cleared');
}

/**
 * Clean up old metrics (remove models with no recent activity)
 */
export function cleanupOldMetrics(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, metrics] of modelMetrics.entries()) {
    const lastActivity = Math.max(
      metrics.lastSuccessTime || 0,
      metrics.lastFailureTime || 0
    );

    if (now - lastActivity > maxAge && metrics.successCount + metrics.failureCount < METRICS_CONFIG.MIN_SAMPLES) {
      modelMetrics.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`[ChatbotMetrics] Cleaned up ${cleaned} old model metrics`);
  }
}

// Periodic cleanup (every hour)
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupOldMetrics();
  }, 60 * 60 * 1000);
}
