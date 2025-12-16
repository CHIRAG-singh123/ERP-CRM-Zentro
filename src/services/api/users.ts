import { fetchJson } from './http';
import type { User } from './auth';

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  profile?: {
    timezone?: string;
    companyInfo?: string;
    avatar?: string;
  };
  password?: string;
}

export interface AvatarUploadResponse {
  message: string;
  avatarUrl: string;
  user: User;
}

export const getAllUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}): Promise<UserListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.role) queryParams.set('role', params.role);
  if (params?.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());

  return fetchJson<UserListResponse>(`/admin/users?${queryParams.toString()}`);
};

export const updateUser = async (id: string, data: UpdateUserData): Promise<{ user: User }> => {
  return fetchJson<{ user: User }>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteUser = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/admin/users/${id}`, {
    method: 'DELETE',
  });
};

export const toggleUserStatus = async (id: string): Promise<{ message: string; user: User }> => {
  return fetchJson<{ message: string; user: User }>(`/admin/users/${id}/toggle-status`, {
    method: 'PUT',
  });
};

export const uploadUserAvatar = async (userId: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetchJson<AvatarUploadResponse>(`/admin/users/${userId}/avatar`, {
    method: 'POST',
    body: formData,
  });

  return response.avatarUrl;
};

