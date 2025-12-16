import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../../services/api/companies';
import { useToast } from '../../context/ToastContext';

export interface CreateCompanyData {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  tags?: string[];
  description?: string;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {}

export function useAccounts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string;
}) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: () => getCompanies(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateCompanyData) => createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      success('Account created successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create account');
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyData }) => updateCompany(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['company', variables.id] });
      success('Account updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update account');
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      success('Account deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete account');
    },
  });
}

