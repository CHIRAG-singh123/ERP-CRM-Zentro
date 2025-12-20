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

export interface VerifyEmailData {
  token: string;
}

export const verifyEmail = async (token: string): Promise<{ message: string }> => {
  // Note: Email verification is typically handled via GET request with token in query string
  // This function is provided for programmatic verification if needed
  return fetchJson<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    skipAuth: true,
  });
};

export interface GoogleProfile {
  name: string;
  email: string;
  profilePicture?: string;
}

export interface GetGoogleProfileResponse {
  success: boolean;
  profile: GoogleProfile;
}

export interface CompleteGoogleSignupData {
  sessionToken: string;
  password: string;
  confirmPassword: string;
}

export interface CompleteGoogleSignupResponse {
  success: boolean;
  message: string;
  user: {
    email: string;
    name: string;
  };
}

/**
 * Get Google profile from session token (for pre-filling signup form)
 */
export const getGoogleProfile = async (token: string): Promise<GetGoogleProfileResponse> => {
  return fetchJson<GetGoogleProfileResponse>(`/auth/google-profile?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    skipAuth: true,
  });
};

/**
 * Complete Google OAuth signup with password
 */
export const completeGoogleSignup = async (data: CompleteGoogleSignupData): Promise<CompleteGoogleSignupResponse> => {
  return fetchJson<CompleteGoogleSignupResponse>('/auth/complete-google-signup', {
    method: 'POST',
    body: JSON.stringify(data),
    skipAuth: true,
  });
};

