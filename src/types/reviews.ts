import { User } from '../services/api/auth';

export interface Review {
  _id: string;
  productId: string;
  customerId: User;
  rating: number;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

export interface ReviewListResponse {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

