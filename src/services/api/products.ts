import { fetchJson } from './http';
import type {
  Product,
  ProductListResponse,
  ProductDetailResponse,
  ProductFormData,
} from '../../types/products';

export const getProducts = async (
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    createdBy?: string;
    isActive?: boolean;
  },
  skipAuth?: boolean
): Promise<ProductListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.category) queryParams.set('category', params.category);
  if (params?.createdBy) queryParams.set('createdBy', params.createdBy);
  if (params?.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());

  return fetchJson<ProductListResponse>(`/products?${queryParams.toString()}`, {
    skipAuth: skipAuth ?? false,
  });
};

export const getProduct = async (id: string, skipAuth?: boolean): Promise<ProductDetailResponse> => {
  return fetchJson<ProductDetailResponse>(`/products/${id}`, {
    skipAuth: skipAuth ?? false,
  });
};

export const createProduct = async (data: ProductFormData): Promise<{ product: Product }> => {
  return fetchJson<{ product: Product }>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateProduct = async (
  id: string,
  data: Partial<ProductFormData & { isActive: boolean }>
): Promise<{ product: Product }> => {
  return fetchJson<{ product: Product }>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteProduct = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/products/${id}`, {
    method: 'DELETE',
  });
};

export interface ProductImageUploadResponse {
  message: string;
  imageUrl: string;
}

export const uploadProductImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetchJson<ProductImageUploadResponse>('/products/upload-image', {
    method: 'POST',
    body: formData,
  });

  return response.imageUrl;
};

