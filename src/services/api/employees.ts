import { fetchJson } from './http';
import type { EmployeePerformanceResponse } from '../../types/employees';
import type { User } from './auth';

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getMyPerformance = async (): Promise<EmployeePerformanceResponse> => {
  return fetchJson<EmployeePerformanceResponse>('/employees/me/performance');
};

export const getUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<UserListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.role) queryParams.set('role', params.role);

  return fetchJson<UserListResponse>(`/employees/users?${queryParams.toString()}`);
};

