import { fetchJson } from './http';

export interface Lead {
  _id: string;
  title: string;
  contactId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  companyId?: {
    _id: string;
    name: string;
  };
  source: 'website' | 'referral' | 'social' | 'email' | 'phone' | 'other';
  status: 'New' | 'Contacted' | 'Qualified' | 'Lost' | 'Converted';
  value?: number;
  ownerId?: {
    _id: string;
    name: string;
    email: string;
  };
  description?: string;
  notes?: string;
  expectedCloseDate?: string;
  convertedToDealId?: string;
  tenantId?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadData {
  title: string;
  contactId?: string;
  companyId?: string;
  source?: Lead['source'];
  status?: Lead['status'];
  value?: number;
  ownerId?: string;
  description?: string;
  notes?: string;
  expectedCloseDate?: string;
}

export interface UpdateLeadData extends Partial<CreateLeadData> {}

export interface LeadsResponse {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getLeads = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Lead['status'];
  ownerId?: string;
}): Promise<LeadsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.ownerId) queryParams.append('ownerId', params.ownerId);

  const queryString = queryParams.toString();
  return fetchJson<LeadsResponse>(`/leads${queryString ? `?${queryString}` : ''}`);
};

export const getLead = async (id: string): Promise<{ lead: Lead }> => {
  return fetchJson<{ lead: Lead }>(`/leads/${id}`);
};

export const createLead = async (data: CreateLeadData): Promise<{ lead: Lead }> => {
  return fetchJson<{ lead: Lead }>('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateLead = async (id: string, data: UpdateLeadData): Promise<{ lead: Lead }> => {
  return fetchJson<{ lead: Lead }>(`/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteLead = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/leads/${id}`, {
    method: 'DELETE',
  });
};

export const convertLeadToDeal = async (
  id: string,
  data?: { value?: number; closeDate?: string }
): Promise<{ deal: unknown; lead: Lead }> => {
  return fetchJson<{ deal: unknown; lead: Lead }>(`/leads/${id}/convert`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
};

export const exportLeads = async (): Promise<Blob> => {
  const { API_BASE_URL } = await import('./config');
  const { getAccessToken } = await import('./http');
  
  const url = new URL('/leads/export', API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL);
  const token = getAccessToken();
  
  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'text/csv',
    },
  });
  
  if (!response.ok) {
    let errorMessage = `Failed to export leads (Status: ${response.status})`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  return response.blob();
};

export const importLeads = async (file: File): Promise<{ created: number; errors?: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchJson<{ created: number; errors?: string[] }>('/leads/import', {
    method: 'POST',
    body: formData,
  });
};

