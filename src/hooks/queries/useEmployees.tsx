import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminApi from '../../services/api/admin';
import type { EmployeeFormData } from '../../types/employees';

export function useEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => adminApi.getEmployees(params),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeFormData) => adminApi.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmployeeFormData & { isActive: boolean }> }) =>
      adminApi.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUploadEmployeesCSV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => adminApi.uploadEmployeesCSV(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useEmployeePerformance(employeeId: string) {
  return useQuery({
    queryKey: ['employee-performance', employeeId],
    queryFn: () => adminApi.getEmployeePerformance(employeeId),
    enabled: !!employeeId,
  });
}

export function usePromoteToAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.promoteToAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

