import { User } from '../services/api/auth';

export interface ReplyRead {
  userId: string | User;
  readAt: string;
}

export interface Reply {
  _id: string;
  userId: User;
  comment: string;
  readBy?: ReplyRead[];
  replies: Reply[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductRef {
  _id: string;
  name: string;
}

export interface Review {
  _id: string;
  productId: string | ProductRef;
  customerId: User;
  rating: number;
  comment: string;
  isVerified: boolean;
  replies?: Reply[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

export interface ReplyFormData {
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

export interface ReviewResponse {
  review: Review;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface AllProductsUnreadCountsResponse {
  productCounts: Record<string, number>;
}
