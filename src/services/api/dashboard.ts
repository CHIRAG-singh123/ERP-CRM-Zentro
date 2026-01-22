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
  
  // Build URL - ensure proper formatting
  const path = '/reports/dashboard/export';
  const url = path.startsWith('http') 
    ? path 
    : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
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
    
    // Handle specific HTTP status codes
    const statusMessages: Record<number, string> = {
      401: 'Authentication failed. Please log in again.',
      403: 'You do not have permission to export dashboard.',
      404: 'Route not found. Please check the endpoint.',
      500: 'Server error while generating PDF.',
    };
    
    if (statusMessages[response.status]) {
      errorMessage = statusMessages[response.status];
    } else {
      // Try to extract error message from response
      try {
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || errorText;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          } else {
            errorMessage = response.statusText || errorMessage;
          }
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  // Validate response content type
  const contentType = response.headers.get('Content-Type');
  if (contentType && !contentType.includes('application/pdf')) {
    logger.warn('[Dashboard Export] Unexpected content type:', contentType);
  }
  
  const blob = await response.blob();
  
  if (blob.size === 0) {
    throw new Error('Received empty PDF file from server');
  }
  
  // Verify PDF file signature
  const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const pdfHeader = String.fromCharCode(...bytes);
  
  if (pdfHeader !== '%PDF') {
    throw new Error('Received file is not a valid PDF');
  }
  
  return blob;
}
