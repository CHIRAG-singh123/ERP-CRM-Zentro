import { fetchJson } from './http';
import type { EmployeeListResponse, EmployeeFormData, EmployeePerformanceResponse, CSVUploadResponse } from '../../types/employees';
import type { Employee } from '../../types/employees';

export const getEmployees = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}): Promise<EmployeeListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());

  return fetchJson<EmployeeListResponse>(`/admin/employees?${queryParams.toString()}`);
};

export const createEmployee = async (data: EmployeeFormData): Promise<{ employee: Employee }> => {
  return fetchJson<{ employee: Employee }>('/admin/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateEmployee = async (
  id: string,
  data: Partial<EmployeeFormData & { isActive: boolean }>
): Promise<{ employee: Employee }> => {
  return fetchJson<{ employee: Employee }>(`/admin/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteEmployee = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/admin/employees/${id}`, {
    method: 'DELETE',
  });
};

export const uploadEmployeesCSV = async (file: File): Promise<CSVUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return fetchJson<CSVUploadResponse>('/admin/employees/upload-csv', {
    method: 'POST',
    body: formData,
  });
};

export const getEmployeePerformance = async (id: string): Promise<EmployeePerformanceResponse> => {
  return fetchJson<EmployeePerformanceResponse>(`/admin/employees/${id}/performance`);
};

export const promoteToAdmin = async (id: string): Promise<{ message: string; employee: Employee }> => {
  return fetchJson<{ message: string; employee: Employee }>(`/admin/employees/${id}/promote`, {
    method: 'PUT',
  });
};

