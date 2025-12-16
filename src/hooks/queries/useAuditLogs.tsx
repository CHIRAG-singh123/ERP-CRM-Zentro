import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, getAuditLog, type AuditLog } from '../../services/api/audit';

export function useAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: AuditLog['action'];
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['auditLogs', params],
    queryFn: () => getAuditLogs(params),
    staleTime: 30 * 1000,
  });
}

export function useAuditLog(id: string | undefined) {
  return useQuery({
    queryKey: ['auditLog', id],
    queryFn: () => getAuditLog(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

