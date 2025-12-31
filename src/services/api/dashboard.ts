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

export async function exportDashboardPDF(): Promise<Blob> {
  const { API_BASE_URL } = await import('./config');
  const { getAccessToken } = await import('./http');
  
  // Build URL using same method as invoice download
  const path = '/reports/dashboard/export';
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const token = getAccessToken();
  
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/pdf',
    },
  });
  
  if (!response.ok) {
    let errorMessage = `Failed to export dashboard PDF (Status: ${response.status})`;
    try {
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } else {
        const errorText = await response.text();
        if (errorText) {
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        }
      }
    } catch {
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to export dashboard.';
      } else if (response.status === 404) {
        errorMessage = 'Route not found. Please check the endpoint.';
      } else if (response.status === 500) {
        errorMessage = 'Server error while generating PDF.';
      }
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  // Check if response is actually a PDF
  const contentType = response.headers.get('Content-Type');
  if (contentType && !contentType.includes('application/pdf')) {
    console.warn('[Dashboard Export] Unexpected content type:', contentType);
  }
  
  const blob = await response.blob();
  
  if (blob.size === 0) {
    throw new Error('Received empty PDF file from server');
  }
  
  // Verify it's actually a PDF by checking the first bytes
  const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const pdfHeader = String.fromCharCode(...bytes);
  
  if (pdfHeader !== '%PDF') {
    throw new Error('Received file is not a valid PDF');
  }
  
  return blob;
}
