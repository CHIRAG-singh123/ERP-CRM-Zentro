import { fetchJson } from './http';
import type {
  DocumentsListResponse,
  DocumentDetailResponse,
  UploadDocumentResponse,
  DocumentPreviewResponse,
  GetDocumentsParams,
} from '../../types/documents';

export const getDocuments = async (params?: GetDocumentsParams): Promise<DocumentsListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.fileType) queryParams.set('fileType', params.fileType);
  if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  return fetchJson<DocumentsListResponse>(`/documents?${queryParams.toString()}`);
};

export const getDocument = async (id: string): Promise<DocumentDetailResponse> => {
  return fetchJson<DocumentDetailResponse>(`/documents/${id}`);
};

export const uploadDocument = async (
  file: File,
  metadata?: { description?: string; tags?: string[] }
): Promise<UploadDocumentResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata?.description) {
    formData.append('description', metadata.description);
  }
  if (metadata?.tags && metadata.tags.length > 0) {
    formData.append('tags', metadata.tags.join(','));
  }

  return fetchJson<UploadDocumentResponse>('/documents', {
    method: 'POST',
    body: formData,
  });
};

export const downloadDocument = async (id: string, filename: string): Promise<void> => {
  // Get base URL - handle both cases: with /api and without
  let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // Remove trailing slash if present
  baseUrl = baseUrl.replace(/\/$/, '');
  // If baseUrl doesn't end with /api, add it
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }
  
  const token = localStorage.getItem('accessToken');
  
  console.log(`[Download] Starting download for document ID: ${id}, filename: ${filename}`);
  console.log(`[Download] Base URL: ${baseUrl}`);
  
  if (!token) {
    console.error('[Download] No authentication token found');
    throw new Error('Authentication required. Please log in again.');
  }

  const downloadUrl = `${baseUrl}/documents/${id}/download`;
  console.log(`[Download] Full URL: ${downloadUrl}`);

  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: '*/*',
      },
    });

    console.log(`[Download] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[Download] Error response:`, errorText);
      
      let errorMessage = 'Failed to download document';
      
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (response.status === 403) {
        // Try to parse the error message from backend
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'You do not have permission to download this document. Only the document owner or admin can access it.';
        } catch {
          errorMessage = 'You do not have permission to download this document. Only the document owner or admin can access it.';
        }
      } else if (response.status === 404) {
        errorMessage = 'Document not found. It may have been deleted.';
      } else {
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Download failed: ${response.statusText}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    // Get the blob
    const blob = await response.blob();
    console.log(`[Download] Blob received, size: ${blob.size} bytes, type: ${blob.type}`);
    
    // Check if blob is valid
    if (blob.size === 0) {
      console.error('[Download] Blob is empty');
      throw new Error('Downloaded file is empty');
    }

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    console.log(`[Download] Triggering download for: ${filename}`);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      console.log(`[Download] Download completed for: ${filename}`);
    }, 100);
  } catch (error) {
    console.error('[Download] Download error:', error);
    throw error;
  }
};

export const deleteDocument = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/documents/${id}`, {
    method: 'DELETE',
  });
};

export const getDocumentPreviewUrl = async (id: string): Promise<DocumentPreviewResponse> => {
  return fetchJson<DocumentPreviewResponse>(`/documents/${id}/preview`);
};

// Helper function to get the base API URL
const getBaseUrl = (): string => {
  let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  baseUrl = baseUrl.replace(/\/$/, '');
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }
  return baseUrl;
};

// Get the direct serve URL for a document (for local preview) - legacy
export const getDocumentServeUrl = (id: string): string => {
  return `${getBaseUrl()}/documents/${id}/serve`;
};

// Get the direct download URL for a document
export const getDocumentDownloadUrl = (id: string): string => {
  return `${getBaseUrl()}/documents/${id}/download`;
};

/**
 * Get the URL to view a document as PDF in the browser
 * This URL opens the PDF directly in a new tab using the browser's native PDF viewer
 * @param id - Document ID
 * @returns URL string that can be opened in a new tab
 */
export const getDocumentViewUrl = (id: string): string => {
  const baseUrl = getBaseUrl();
  const token = localStorage.getItem('accessToken');
  
  // Include the auth token as a query parameter for the view endpoint
  // This allows the browser to open the PDF directly without needing to set headers
  return `${baseUrl}/documents/${id}/view?token=${encodeURIComponent(token || '')}`;
};

// Response type for view token generation (kept for backward compatibility)
export interface ViewTokenResponse {
  viewToken: string;
  publicViewUrl: string;
  expiresAt: string;
  document: {
    _id: string;
    originalName: string;
    mimeType: string;
    fileType: string;
  };
}

// Generate a temporary public view token for a document (legacy - kept for backward compatibility)
export const generateViewToken = async (id: string): Promise<ViewTokenResponse> => {
  return fetchJson<ViewTokenResponse>(`/documents/${id}/view-token`, {
    method: 'POST',
  });
};

// Legacy functions - kept for backward compatibility but no longer used
// Get the Google Docs Viewer URL for a public document URL
export const getGoogleDocsViewerUrl = (publicFileUrl: string): string => {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(publicFileUrl)}&embedded=true`;
};

// Get the Office Online Viewer URL for a public document URL
export const getOfficeOnlineViewerUrl = (publicFileUrl: string): string => {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicFileUrl)}`;
};

