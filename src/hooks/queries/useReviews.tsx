import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reviewApi from '../../services/api/reviews';
import type { ReviewFormData } from '../../types/reviews';

export function useProductReviews(
  productId: string,
  params?: {
    page?: number;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: ['product-reviews', productId, params],
    queryFn: () => reviewApi.getProductReviews(productId, params),
    enabled: !!productId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: ReviewFormData }) =>
      reviewApi.createReview(productId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ReviewFormData> }) =>
      reviewApi.updateReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewApi.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

