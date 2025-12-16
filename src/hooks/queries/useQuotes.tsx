import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  updateQuoteStatus,
  deleteQuote,
  type CreateQuoteData,
  type UpdateQuoteData,
  type Quote,
} from '../../services/api/quotes';
import { useToast } from '../../context/ToastContext';

export function useQuotes(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Quote['status'];
  dealId?: string;
}) {
  return useQuery({
    queryKey: ['quotes', params],
    queryFn: () => getQuotes(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: () => getQuote(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateQuoteData) => createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      success('Quote created successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create quote');
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuoteData }) => updateQuote(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', variables.id] });
      success('Quote updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update quote');
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Quote['status'] }) => updateQuoteStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', variables.id] });
      success('Quote status updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update quote status');
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      success('Quote deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete quote');
    },
  });
}

