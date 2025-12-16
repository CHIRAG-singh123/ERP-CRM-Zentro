import { fetchJson } from './http';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'lead' | 'deal' | 'comment';
  userId: string;
  relatedTo?: {
    type: 'Lead' | 'Deal' | 'Contact' | 'Company' | 'Invoice' | 'Quote' | 'Task';
    id: string;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export const getNotifications = async (params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');

  const queryString = queryParams.toString();
  return fetchJson<NotificationsResponse>(`/notifications${queryString ? `?${queryString}` : ''}`);
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  return fetchJson<UnreadCountResponse>('/notifications/unread-count');
};

export const markAsRead = async (id: string): Promise<{ notification: Notification }> => {
  return fetchJson<{ notification: Notification }>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
};

export const markAllAsRead = async (): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>('/notifications/read-all', {
    method: 'PATCH',
  });
};

export const deleteNotification = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/notifications/${id}`, {
    method: 'DELETE',
  });
};

