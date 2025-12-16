import { Review } from './reviews';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  sku?: string;
  category: string;
  images: string[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
    profile?: {
      avatar?: string;
    };
  };
  isActive: boolean;
  tags: string[];
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  price: number;
  category: string;
  averageRating: number;
  reviewCount: number;
  image?: string;
  createdBy: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  sku?: string;
  category: string;
  tags: string[];
  images: string[];
  createdBy?: string; // Optional, only for admins
}

export interface ProductListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductDetailResponse {
  product: Product;
  reviews: Review[];
}

