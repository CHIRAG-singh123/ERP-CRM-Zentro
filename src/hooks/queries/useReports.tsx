import { useQuery } from '@tanstack/react-query';

import { getKPIs, getLeadConversionAnalytics, getCrossEntityAnalytics } from '../../services/api/reports';

export function useKPIs() {
  return useQuery({
    queryKey: ['reports', 'kpis'],
    queryFn: getKPIs,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeadConversionAnalytics() {
  return useQuery({
    queryKey: ['reports', 'conversion-analytics'],
    queryFn: getLeadConversionAnalytics,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCrossEntityAnalytics() {
  return useQuery({
    queryKey: ['reports', 'cross-entity-analytics'],
    queryFn: getCrossEntityAnalytics,
    staleTime: 5 * 60 * 1000,
  });
}

