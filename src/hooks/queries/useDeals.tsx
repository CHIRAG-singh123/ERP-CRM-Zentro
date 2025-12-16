import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  type CreateDealData,
  type UpdateDealData,
  type Deal,
} from '../../services/api/deals';
import { useToast } from '../../context/ToastContext';

export function useDeals(params?: {
  page?: number;
  limit?: number;
  search?: string;
  stage?: Deal['stage'];
  ownerId?: string;
}) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => getDeals(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDeal(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateDealData) => createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      success('Deal created successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create deal');
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealData }) => updateDeal(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', variables.id] });
      success('Deal updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update deal');
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      success('Deal deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete deal');
    },
  });
}

