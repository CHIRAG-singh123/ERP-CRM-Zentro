import { fetchJson } from './http';

export interface QuoteLineItem {
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

export interface Quote {
  _id: string;
  quoteNumber: string;
  dealId: {
    _id: string;
    title: string;
    value: number;
    stage: string;
  };
  contactId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  companyId?: {
    _id: string;
    name: string;
  };
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string;
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

export interface CreateQuoteData {
  dealId: string;
  contactId?: string;
  companyId?: string;
  lineItems: Array<{
    productId?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
  }>;
  validUntil?: string;
  notes?: string;
}

export interface UpdateQuoteData extends Partial<CreateQuoteData> {
  status?: Quote['status'];
}

export interface QuotesResponse {
  quotes: Quote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getQuotes = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Quote['status'];
  dealId?: string;
}): Promise<QuotesResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.dealId) queryParams.append('dealId', params.dealId);

  const queryString = queryParams.toString();
  return fetchJson<QuotesResponse>(`/quotes${queryString ? `?${queryString}` : ''}`);
};

export const getQuote = async (id: string): Promise<{ quote: Quote }> => {
  return fetchJson<{ quote: Quote }>(`/quotes/${id}`);
};

export const createQuote = async (data: CreateQuoteData): Promise<{ quote: Quote }> => {
  return fetchJson<{ quote: Quote }>('/quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateQuote = async (id: string, data: UpdateQuoteData): Promise<{ quote: Quote }> => {
  return fetchJson<{ quote: Quote }>(`/quotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const updateQuoteStatus = async (id: string, status: Quote['status']): Promise<{ quote: Quote }> => {
  return fetchJson<{ quote: Quote }>(`/quotes/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const deleteQuote = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/quotes/${id}`, {
    method: 'DELETE',
  });
};

