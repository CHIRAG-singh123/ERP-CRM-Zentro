import { USE_API_MOCKS } from './config';
import { fetchJson, ApiError } from './http';
import { logger } from '../../utils/logger';
import { mockDashboardSummary } from './mocks';
import type { DashboardSummary } from '../../types/crm';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (USE_API_MOCKS) {
    return Promise.resolve(mockDashboardSummary);
  }

  try {
    return await fetchJson<DashboardSummary>('/api/dashboard/summary');
  } catch (error) {
    logger.warn('Falling back to mock dashboard summary', error);
    if (error instanceof ApiError && error.status >= 500) {
      return mockDashboardSummary;
    }
    throw error;
  }
}

