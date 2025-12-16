import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  type CreateContactData,
  type UpdateContactData,
} from '../../services/api/contacts';
import { useToast } from '../../context/ToastContext';

export function useContacts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
}) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => getContacts(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => getContact(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateContactData) => createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      success('Contact created successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create contact');
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactData }) => updateContact(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.id] });
      success('Contact updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update contact');
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      success('Contact deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete contact');
    },
  });
}

