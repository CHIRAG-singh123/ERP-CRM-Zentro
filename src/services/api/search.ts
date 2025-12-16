import { fetchJson } from './http';

export interface SearchResult {
  companies: Array<{
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    industry?: string;
  }>;
  contacts: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    emails?: Array<{ email: string }>;
    phones?: Array<{ phone: string }>;
    jobTitle?: string;
    companyId?: {
      _id: string;
      name: string;
    };
  }>;
  deals: Array<{
    _id: string;
    title: string;
    value: number;
    stage: string;
    closeDate: string;
    contactId?: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    companyId?: {
      _id: string;
      name: string;
    };
  }>;
  leads: Array<{
    _id: string;
    title: string;
    status: string;
    source: string;
    value: number;
    contactId?: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    companyId?: {
      _id: string;
      name: string;
    };
  }>;
}

export interface SearchResponse {
  results: SearchResult;
  query: string;
}

export const globalSearch = async (query: string, limit = 10): Promise<SearchResponse> => {
  return fetchJson<SearchResponse>('/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit }),
  });
};

