import { fetchJson } from './http';

export interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  companyId?: {
    _id: string;
    name: string;
  };
  emails?: Array<{
    email: string;
    type: 'work' | 'personal' | 'other';
    isPrimary: boolean;
  }>;
  phones?: Array<{
    phone: string;
    type: 'work' | 'mobile' | 'home' | 'other';
    isPrimary: boolean;
  }>;
  jobTitle?: string;
  department?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  tags?: string[];
  tenantId?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactData {
  firstName: string;
  lastName: string;
  companyId?: string;
  emails?: Contact['emails'];
  phones?: Contact['phones'];
  jobTitle?: string;
  department?: string;
  address?: Contact['address'];
  notes?: string;
  tags?: string[];
}

export interface UpdateContactData extends Partial<CreateContactData> {}

export interface ContactsResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getContacts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
}): Promise<ContactsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.companyId) queryParams.append('companyId', params.companyId);

  const queryString = queryParams.toString();
  return fetchJson<ContactsResponse>(`/contacts${queryString ? `?${queryString}` : ''}`);
};

export const getContact = async (id: string): Promise<{ contact: Contact }> => {
  return fetchJson<{ contact: Contact }>(`/contacts/${id}`);
};

export const createContact = async (data: CreateContactData): Promise<{ contact: Contact }> => {
  return fetchJson<{ contact: Contact }>('/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateContact = async (id: string, data: UpdateContactData): Promise<{ contact: Contact }> => {
  return fetchJson<{ contact: Contact }>(`/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteContact = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/contacts/${id}`, {
    method: 'DELETE',
  });
};

export const importContacts = async (file: File): Promise<{ created: number; errors?: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchJson<{ created: number; errors?: string[] }>('/contacts/import', {
    method: 'POST',
    body: formData,
  });
};

export const exportContacts = async (): Promise<Blob> => {
  const { API_BASE_URL } = await import('./config');
  const { getAccessToken } = await import('./http');
  
  const url = new URL('/contacts/export', API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL);
  const token = getAccessToken();
  
  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'text/csv',
    },
  });
  
  if (!response.ok) {
    let errorMessage = `Failed to export contacts (Status: ${response.status})`;
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
