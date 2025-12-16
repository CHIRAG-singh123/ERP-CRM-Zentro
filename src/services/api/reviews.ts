import { fetchJson } from './http';
import type { Review, ReviewListResponse, ReviewFormData } from '../../types/reviews';

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

