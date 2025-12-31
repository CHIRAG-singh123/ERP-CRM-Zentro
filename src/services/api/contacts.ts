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
  
  // Build URL using same method as invoice download
  const path = '/contacts/export';
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
    let errorMessage = `Failed to export contacts (Status: ${response.status})`;
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
        errorMessage = 'You do not have permission to export contacts.';
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
    console.warn('[Contacts Export] Unexpected content type:', contentType);
  }
  
  const blob = await response.blob();
  
  if (blob.size === 0) {
    throw new Error('Received empty CSV file from server');
  }
  
  return blob;
};

export interface SendEmailData {
  fromEmail: string;
  subject: string;
  message: string;
}

export const sendEmailToContact = async (
  id: string,
  data: SendEmailData
): Promise<{ success: boolean; message: string }> => {
  return fetchJson<{ success: boolean; message: string }>(`/contacts/${id}/send-email`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};