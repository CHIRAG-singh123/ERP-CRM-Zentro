import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  type CreateInvoiceData,
  type UpdateInvoiceData,
  type Invoice,
} from '../../services/api/invoices';
import { useToast } from '../../context/ToastContext';

export function useInvoices(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: Invoice['status'];
  contactId?: string;
  companyId?: string;
}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getInvoices(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateInvoiceData) => createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      success('Invoice created successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create invoice');
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceData }) => updateInvoice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      success('Invoice updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update invoice');
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, status, amountPaid }: { id: string; status: Invoice['status']; amountPaid?: number }) =>
      updateInvoiceStatus(id, status, amountPaid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      success('Invoice status updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update invoice status');
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      success('Invoice deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete invoice');
    },
  });
}

