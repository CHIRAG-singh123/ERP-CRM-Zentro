import { useQuery } from '@tanstack/react-query';

import { getRoles } from '../../services/api/crmEntities';

export function useRoles() {
  return useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: getRoles,
    staleTime: 10 * 60 * 1000,
  });
}

