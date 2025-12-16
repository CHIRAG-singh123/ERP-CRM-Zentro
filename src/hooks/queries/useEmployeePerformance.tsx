import { useQuery } from '@tanstack/react-query';
import * as employeeApi from '../../services/api/employees';

export function useMyPerformance() {
  return useQuery({
    queryKey: ['my-performance'],
    queryFn: () => employeeApi.getMyPerformance(),
  });
}

export function useUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => employeeApi.getUsers(params),
  });
}

