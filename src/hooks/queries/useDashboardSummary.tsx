import { useQuery } from '@tanstack/react-query';
import { getKPIs } from '../../services/api/reports';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: getKPIs,
    staleTime: 60 * 1000,
  });
}

