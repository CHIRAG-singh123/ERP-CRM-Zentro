import { fetchJson } from './http';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  profile: {
    avatar: string;
    timezone: string;
    companyInfo: string;
  };
  tenantId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface UpdateProfileInput {
  name?: string;
  profile?: {
    timezone?: string;
    companyInfo?: string;
  };
}

export interface UpdateEmailInput {
  email: string;
  password: string;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AvatarUploadResponse {
  message: string;
  avatarUrl: string;
  user: User;
}

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  return fetchJson<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  return fetchJson<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
};

export const logout = async (): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
};

export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  return fetchJson<RefreshTokenResponse>('/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
};

export const getCurrentUser = async (): Promise<{ user: User }> => {
  return fetchJson<{ user: User }>('/auth/me', {
    method: 'GET',
  });
};

export const updateProfile = async (data: UpdateProfileInput): Promise<{ message: string; user: User }> => {
  return fetchJson<{ message: string; user: User }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const updateEmail = async (data: UpdateEmailInput): Promise<{ message: string; user: User }> => {
  return fetchJson<{ message: string; user: User }>('/auth/email', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const updatePassword = async (data: UpdatePasswordInput): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const uploadAvatar = async (file: File): Promise<AvatarUploadResponse> => {
  const formData = new FormData();
  formData.append('avatar', file);

  return fetchJson<AvatarUploadResponse>('/auth/avatar', {
    method: 'POST',
    body: formData,
  });
};

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export const forgotPassword = async (data: ForgotPasswordData): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>('/auth/forgot', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
};

export const resetPassword = async (data: ResetPasswordData): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>('/auth/reset', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
};

