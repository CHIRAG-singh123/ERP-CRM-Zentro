import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDocuments,
  getDocument,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} from '../../services/api/documents';
import { useToast } from '../../context/ToastContext';
import type { GetDocumentsParams } from '../../types/documents';

export function useDocuments(params?: GetDocumentsParams) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => getDocuments(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => getDocument(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({
      file,
      metadata,
    }: {
      file: File;
      metadata?: { description?: string; tags?: string[] };
    }) => uploadDocument(file, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      success('Document uploaded successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to upload document');
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document'] });
      success('Document deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete document');
    },
  });
}

export function useDownloadDocument() {
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      downloadDocument(id, filename),
    onSuccess: () => {
      success('Document download started');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to download document');
    },
  });
}
