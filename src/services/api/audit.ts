import { fetchJson } from './http';

export interface AuditLog {
  _id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT';
  entityType: string;
  entityId?: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogsResponse {
  auditLogs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getAuditLogs = async (params?: {
  page?: number;
  limit?: number;
  action?: AuditLog['action'];
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AuditLogsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.action) queryParams.append('action', params.action);
  if (params?.entityType) queryParams.append('entityType', params.entityType);
  if (params?.userId) queryParams.append('userId', params.userId);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchJson<AuditLogsResponse>(`/audit${queryString ? `?${queryString}` : ''}`);
};

export const getAuditLog = async (id: string): Promise<{ auditLog: AuditLog }> => {
  return fetchJson<{ auditLog: AuditLog }>(`/audit/${id}`);
};

