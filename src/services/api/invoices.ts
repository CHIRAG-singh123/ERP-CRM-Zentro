import { fetchJson } from './http';

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
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/invoices/${id}/pdf`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    },
  });
  if (!response.ok) throw new Error('Failed to download PDF');
  return response.blob();
};

