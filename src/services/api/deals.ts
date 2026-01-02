import { fetchJson } from './http';

export interface Deal {
  _id: string;
  title: string;
  leadId?: string;
  contactId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  companyId?: {
    _id: string;
    name: string;
  };
  value: number;
  currency?: string;
  stage: 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  probability?: number;
  closeDate: string;
  products?: Array<{
    productId?: {
      _id: string;
      name: string;
      price: number;
    };
    quantity?: number;
    unitPrice?: number;
    discount?: number;
  }>;
  ownerId?: {
    _id: string;
    name: string;
    email: string;
  };
  description?: string;
  notes?: string;
  tenantId?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDealData {
  title: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  value: number;
  currency?: string;
  stage?: Deal['stage'];
  probability?: number;
  closeDate: string;
  products?: Deal['products'];
  ownerId?: string;
  description?: string;
  notes?: string;
}

export interface UpdateDealData extends Partial<CreateDealData> {}

export interface DealsResponse {
  deals: Deal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getDeals = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  stage?: Deal['stage'];
  ownerId?: string;
}): Promise<DealsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.stage) queryParams.append('stage', params.stage);
  if (params?.ownerId) queryParams.append('ownerId', params.ownerId);

  const queryString = queryParams.toString();
  return fetchJson<DealsResponse>(`/deals${queryString ? `?${queryString}` : ''}`);
};

export const getDeal = async (id: string): Promise<{ deal: Deal }> => {
  return fetchJson<{ deal: Deal }>(`/deals/${id}`);
};

export const createDeal = async (data: CreateDealData): Promise<{ deal: Deal }> => {
  return fetchJson<{ deal: Deal }>('/deals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateDeal = async (id: string, data: UpdateDealData): Promise<{ deal: Deal }> => {
  return fetchJson<{ deal: Deal }>(`/deals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteDeal = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/deals/${id}`, {
    method: 'DELETE',
  });
};

export const exportDeals = async (): Promise<Blob> => {
  const { API_BASE_URL } = await import('./config');
  const { getAccessToken } = await import('./http');
  
  // Build URL using same method as contacts export
  const path = '/deals/export';
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const token = getAccessToken();
  
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'text/csv',
    },
  });
  
  if (!response.ok) {
    let errorMessage = `Failed to export deals (Status: ${response.status})`;
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
        errorMessage = 'You do not have permission to export deals.';
      } else if (response.status === 404) {
        errorMessage = 'Route not found. Please check the endpoint.';
      } else if (response.status === 500) {
        errorMessage = 'Server error while generating CSV.';
      }
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  // Check if response is actually a CSV
  const contentType = response.headers.get('Content-Type');
  if (contentType && !contentType.includes('text/csv') && !contentType.includes('application/csv')) {
    console.warn('[Deals Export] Unexpected content type:', contentType);
  }
  
  const blob = await response.blob();
  
  if (blob.size === 0) {
    throw new Error('Received empty CSV file from server');
  }
  
  return blob;
};

export const importDeals = async (file: File): Promise<{ created: number; errors?: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchJson<{ created: number; errors?: string[] }>('/deals/import', {
    method: 'POST',
    body: formData,
  });
};

