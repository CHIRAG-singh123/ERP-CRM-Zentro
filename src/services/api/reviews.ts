import { fetchJson } from './http';
import type { Review, ReviewListResponse, ReviewFormData, ReplyFormData, ReviewResponse, UnreadCountResponse, AllProductsUnreadCountsResponse } from '../../types/reviews';

export const getProductReviews = async (
  productId: string,
  params?: {
    page?: number;
    limit?: number;
  }
): Promise<ReviewListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  return fetchJson<ReviewListResponse>(
    `/reviews/products/${productId}/reviews?${queryParams.toString()}`
  );
};

export const createReview = async (
  productId: string,
  data: ReviewFormData
): Promise<{ review: Review }> => {
  return fetchJson<{ review: Review }>(`/reviews/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateReview = async (
  id: string,
  data: Partial<ReviewFormData>
): Promise<{ review: Review }> => {
  return fetchJson<{ review: Review }>(`/reviews/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteReview = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/reviews/${id}`, {
    method: 'DELETE',
  });
};

// Reply operations
export const createReply = async (
  reviewId: string,
  data: ReplyFormData
): Promise<ReviewResponse> => {
  return fetchJson<ReviewResponse>(`/reviews/${reviewId}/replies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const createNestedReply = async (
  reviewId: string,
  parentReplyId: string,
  data: ReplyFormData
): Promise<ReviewResponse> => {
  return fetchJson<ReviewResponse>(`/reviews/${reviewId}/replies/${parentReplyId}/replies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateReply = async (
  reviewId: string,
  replyId: string,
  data: ReplyFormData
): Promise<ReviewResponse> => {
  return fetchJson<ReviewResponse>(`/reviews/${reviewId}/replies/${replyId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteReply = async (
  reviewId: string,
  replyId: string
): Promise<ReviewResponse> => {
  return fetchJson<ReviewResponse>(`/reviews/${reviewId}/replies/${replyId}`, {
    method: 'DELETE',
  });
};

// Get reviews for employee's product
export const getEmployeeProductReviews = async (
  productId: string
): Promise<{ reviews: Review[] }> => {
  return fetchJson<{ reviews: Review[] }>(`/reviews/employees/products/${productId}/reviews`);
};

// Read tracking operations
export const markReplyAsRead = async (
  reviewId: string,
  replyId: string
): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/reviews/${reviewId}/replies/${replyId}/read`, {
    method: 'POST',
  });
};

export const markReviewRepliesAsRead = async (
  reviewId: string
): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/reviews/${reviewId}/mark-all-read`, {
    method: 'POST',
  });
};

export const getProductUnreadCount = async (
  productId: string
): Promise<UnreadCountResponse> => {
  return fetchJson<UnreadCountResponse>(`/reviews/products/${productId}/unread-count`);
};

export const getAllProductsUnreadCounts = async (): Promise<AllProductsUnreadCountsResponse> => {
  return fetchJson<AllProductsUnreadCountsResponse>(`/reviews/products/unread-counts`);
};

// Get all reviews for all products created by employee
export const getEmployeeAllReviews = async (): Promise<{ reviews: Review[]; products: Array<{ _id: string; name: string }> }> => {
  return fetchJson<{ reviews: Review[]; products: Array<{ _id: string; name: string }> }>(`/reviews/employees/reviews`);
};
