import { fetchJson, getAccessToken } from './http';
import { API_BASE_URL } from './config';

export interface InvoiceLineItem {
  productId?: {
    _id: string;
    name: string;
    price: number;
    sku?: string;
  };
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  quoteId?: {
    _id: string;
    quoteNumber: string;
  };
  dealId?: {
    _id: string;
    title: string;
    value: number;
    stage: string;
  };
  contactId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  companyId?: {
    _id: string;
    name: string;
  };
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  dueDate: string;
  paidDate?: string;
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

export interface CreateInvoiceData {
  quoteId?: string;
  dealId?: string;
  contactId: string;
  companyId?: string;
  lineItems?: Array<{
    productId?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
  }>;
  dueDate?: string;
  notes?: string;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  status?: Invoice['status'];
  amountPaid?: number;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getInvoices = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Invoice['status'];
  contactId?: string;
  companyId?: string;
}): Promise<InvoicesResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.contactId) queryParams.append('contactId', params.contactId);
  if (params?.companyId) queryParams.append('companyId', params.companyId);

  const queryString = queryParams.toString();
  return fetchJson<InvoicesResponse>(`/invoices${queryString ? `?${queryString}` : ''}`);
};

export const getInvoice = async (id: string): Promise<{ invoice: Invoice }> => {
  return fetchJson<{ invoice: Invoice }>(`/invoices/${id}`);
};

export const createInvoice = async (data: CreateInvoiceData): Promise<{ invoice: Invoice }> => {
  return fetchJson<{ invoice: Invoice }>('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateInvoice = async (id: string, data: UpdateInvoiceData): Promise<{ invoice: Invoice }> => {
  return fetchJson<{ invoice: Invoice }>(`/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const updateInvoiceStatus = async (id: string, status: Invoice['status'], amountPaid?: number): Promise<{ invoice: Invoice }> => {
  return fetchJson<{ invoice: Invoice }>(`/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, amountPaid }),
  });
};

export const deleteInvoice = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/invoices/${id}`, {
    method: 'DELETE',
  });
};

export const downloadInvoicePDF = async (id: string): Promise<Blob> => {
  // Build URL using API_BASE_URL from config
  const path = `/invoices/${id}/pdf`;
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  const token = getAccessToken();

  console.log('[PDF Download] Starting download for invoice:', id);
  console.log('[PDF Download] URL:', url);

  try {
    const headers: HeadersInit = {
      Accept: 'application/pdf',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    console.log('[PDF Download] Response status:', response.status, response.statusText);
    console.log('[PDF Download] Content-Type:', response.headers.get('Content-Type'));

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to download PDF';
      
      try {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
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
      } catch (parseError) {
        console.error('[PDF Download] Error parsing error response:', parseError);
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to download this invoice.';
        } else if (response.status === 404) {
          errorMessage = 'Route not found. Please check the invoice ID.';
        } else if (response.status === 500) {
          errorMessage = 'Server error while generating PDF.';
        }
      }

      console.error('[PDF Download] Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    // Check if response is actually a PDF
    const contentType = response.headers.get('Content-Type');
    if (contentType && !contentType.includes('application/pdf')) {
      console.warn('[PDF Download] Unexpected content type:', contentType);
    }

    const blob = await response.blob();
    console.log('[PDF Download] Blob received, size:', blob.size, 'bytes, type:', blob.type);

    if (blob.size === 0) {
      throw new Error('Received empty PDF file from server');
    }

    // Verify it's actually a PDF by checking the first bytes
    const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const pdfHeader = String.fromCharCode(...bytes);
    
    if (pdfHeader !== '%PDF') {
      console.error('[PDF Download] Invalid PDF header:', pdfHeader);
      throw new Error('Received file is not a valid PDF');
    }

    console.log('[PDF Download] PDF validated successfully');
    return blob;
  } catch (error: any) {
    console.error('[PDF Download] Download failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(error?.message || 'Failed to download PDF');
  }
};

