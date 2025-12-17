import { useQuery } from '@tanstack/react-query';
import { getKPIs } from '../../services/api/reports';

export function useDashboardSummary(params?: {
  startDate?: string;
  endDate?: string;
  ownerId?: string;
  stage?: string;
}) {
  return useQuery({
    queryKey: ['dashboard', 'kpis', params],
    queryFn: () => getKPIs(params),
    staleTime: 60 * 1000,
  });
}

