import { fetchJson } from './http';

export interface Company {
  _id: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  tags?: string[];
  description?: string;
  tenantId?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompaniesResponse {
  companies: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getCompanies = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string;
}): Promise<CompaniesResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.tags) queryParams.append('tags', params.tags);

  const queryString = queryParams.toString();
  return fetchJson<CompaniesResponse>(`/companies${queryString ? `?${queryString}` : ''}`);
};

export const getCompany = async (id: string): Promise<{ company: Company }> => {
  return fetchJson<{ company: Company }>(`/companies/${id}`);
};

export const createCompany = async (data: Partial<Company>): Promise<{ company: Company }> => {
  return fetchJson<{ company: Company }>('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateCompany = async (id: string, data: Partial<Company>): Promise<{ company: Company }> => {
  return fetchJson<{ company: Company }>(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteCompany = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/companies/${id}`, {
    method: 'DELETE',
  });
};

export const importCompanies = async (file: File): Promise<{ created: number; duplicates?: number; errors?: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchJson<{ created: number; duplicates?: number; errors?: string[] }>('/companies/import', {
    method: 'POST',
    body: formData,
  });
};

export const exportCompanies = async (): Promise<Blob> => {
  const { API_BASE_URL } = await import('./config');
  const { getAccessToken } = await import('./http');
  
  const url = new URL('/companies/export', API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL);
  const token = getAccessToken();
  
  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'text/csv',
    },
  });
  
  if (!response.ok) {
    let errorMessage = `Failed to export companies (Status: ${response.status})`;
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

export interface SendEmailData {
  fromEmail: string;
  subject: string;
  message: string;
}

export const sendEmailToCompany = async (
  id: string,
  data: SendEmailData
): Promise<{ success: boolean; message: string }> => {
  return fetchJson<{ success: boolean; message: string }>(`/companies/${id}/send-email`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};