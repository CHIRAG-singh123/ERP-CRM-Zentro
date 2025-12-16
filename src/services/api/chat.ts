import { fetchJson } from './http';
import type {
  ChatListResponse,
  ChatDetailResponse,
  MessagesResponse,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateIndividualChatRequest,
  AddMembersRequest,
  SearchChatsResponse,
  ChatGroup,
} from '../../types/chat';

export const getChats = async (): Promise<ChatListResponse> => {
  return fetchJson<ChatListResponse>('/chat');
};

export const getChatById = async (id: string): Promise<ChatDetailResponse> => {
  return fetchJson<ChatDetailResponse>(`/chat/${id}`);
};

export const getMessages = async (
  chatId: string,
  params?: { page?: number; limit?: number }
): Promise<MessagesResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const queryString = queryParams.toString();
  return fetchJson<MessagesResponse>(
    `/chat/${chatId}/messages${queryString ? `?${queryString}` : ''}`
  );
};

export const createGroup = async (
  data: CreateGroupRequest
): Promise<{ chat: ChatGroup }> => {
  return fetchJson<{ chat: ChatGroup }>('/chat/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateGroup = async (
  id: string,
  data: UpdateGroupRequest
): Promise<{ chat: ChatGroup }> => {
  return fetchJson<{ chat: ChatGroup }>(`/chat/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteGroup = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/chat/groups/${id}`, {
    method: 'DELETE',
  });
};

export const addGroupMembers = async (
  groupId: string,
  data: AddMembersRequest
): Promise<{ chat: ChatGroup }> => {
  return fetchJson<{ chat: ChatGroup }>(`/chat/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const removeGroupMember = async (
  groupId: string,
  userId: string
): Promise<{ chat: ChatGroup }> => {
  return fetchJson<{ chat: ChatGroup }>(`/chat/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
  });
};

export const createIndividualChat = async (
  data: CreateIndividualChatRequest
): Promise<{ chat: ChatGroup }> => {
  return fetchJson<{ chat: ChatGroup }>('/chat/individual', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const clearChatHistory = async (chatId: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/chat/${chatId}/history`, {
    method: 'DELETE',
  });
};

export const markAsRead = async (chatId: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/chat/${chatId}/read`, {
    method: 'POST',
  });
};

export const searchChats = async (query: string): Promise<SearchChatsResponse> => {
  return fetchJson<SearchChatsResponse>(`/chat/search?q=${encodeURIComponent(query)}`);
};

export const uploadGroupAvatar = async (
  groupId: string,
  file: File
): Promise<{ message: string; avatarUrl: string; chat: ChatGroup }> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`${apiUrl}/chat/groups/${groupId}/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
};

