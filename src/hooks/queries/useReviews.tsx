import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reviewApi from '../../services/api/reviews';
import type { ReviewFormData, ReplyFormData } from '../../types/reviews';

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

// Employee product reviews query
export function useEmployeeProductReviews(productId: string) {
  return useQuery({
    queryKey: ['employee-product-reviews', productId],
    queryFn: () => reviewApi.getEmployeeProductReviews(productId),
    enabled: !!productId,
  });
}

// Get all reviews for all employee's products
export function useEmployeeAllReviews() {
  return useQuery({
    queryKey: ['employee-all-reviews'],
    queryFn: () => reviewApi.getEmployeeAllReviews(),
  });
}

// Reply mutations
export function useCreateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: ReplyFormData }) =>
      reviewApi.createReply(reviewId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['all-products-unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['product-unread-count'] });
    },
  });
}

export function useCreateNestedReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      parentReplyId,
      data,
    }: {
      reviewId: string;
      parentReplyId: string;
      data: ReplyFormData;
    }) => reviewApi.createNestedReply(reviewId, parentReplyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['all-products-unread-counts'] });
      queryClient.invalidateQueries({ queryKey: ['product-unread-count'] });
    },
  });
}

export function useUpdateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      replyId,
      data,
    }: {
      reviewId: string;
      replyId: string;
      data: ReplyFormData;
    }) => reviewApi.updateReply(reviewId, replyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-product-reviews'] });
    },
  });
}

export function useDeleteReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, replyId }: { reviewId: string; replyId: string }) =>
      reviewApi.deleteReply(reviewId, replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['employee-product-reviews'] });
    },
  });
}

// Read tracking hooks
export function useMarkReplyAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, replyId }: { reviewId: string; replyId: string }) =>
      reviewApi.markReplyAsRead(reviewId, replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['all-products-unread-counts'] });
    },
  });
}

export function useMarkReviewRepliesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewApi.markReviewRepliesAsRead(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['all-products-unread-counts'] });
    },
  });
}

export function useProductUnreadCount(productId: string) {
  return useQuery({
    queryKey: ['product-unread-count', productId],
    queryFn: () => reviewApi.getProductUnreadCount(productId),
    enabled: !!productId,
  });
}

export function useAllProductsUnreadCounts(enabled: boolean = true) {
  return useQuery({
    queryKey: ['all-products-unread-counts'],
    queryFn: () => reviewApi.getAllProductsUnreadCounts(),
    enabled,
  });
}
