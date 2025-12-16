import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToDeal,
  type CreateLeadData,
  type UpdateLeadData,
  type Lead,
} from '../../services/api/leads';
import { useToast } from '../../context/ToastContext';

export function useLeads(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Lead['status'];
  ownerId?: string;
}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => getLeads(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => getLead(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateLeadData) => createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      success('Lead created successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create lead');
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadData }) => updateLead(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.id] });
      success('Lead updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update lead');
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      success('Lead deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete lead');
    },
  });
}

export function useConvertLeadToDeal() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: { value?: number; closeDate?: string } }) =>
      convertLeadToDeal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      success('Lead converted to deal successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to convert lead to deal');
    },
  });
}

