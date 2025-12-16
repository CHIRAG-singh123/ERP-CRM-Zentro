import { useQuery } from '@tanstack/react-query';

import { getTeams } from '../../services/api/crmEntities';

export function useTeams() {
  return useQuery({
    queryKey: ['settings', 'teams'],
    queryFn: getTeams,
    staleTime: 10 * 60 * 1000,
  });
}

