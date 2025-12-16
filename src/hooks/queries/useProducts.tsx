import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import * as productApi from '../../services/api/products';
import type { ProductFormData } from '../../types/products';

// Check if current route is a public customer route
const isPublicRoute = (pathname: string): boolean => {
  return pathname.startsWith('/customers/') || pathname === '/customers';
};

export function useProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  createdBy?: string;
  isActive?: boolean;
}) {
  const location = useLocation();
  const isPublic = isPublicRoute(location.pathname);

  return useQuery({
    queryKey: ['products', params, isPublic],
    queryFn: () => productApi.getProducts(params, isPublic),
  });
}

export function useProduct(id: string) {
  const location = useLocation();
  const isPublic = isPublicRoute(location.pathname);

  return useQuery({
    queryKey: ['product', id, isPublic],
    queryFn: () => productApi.getProduct(id, isPublic),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductFormData) => productApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ProductFormData & { isActive: boolean }>;
    }) => productApi.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

