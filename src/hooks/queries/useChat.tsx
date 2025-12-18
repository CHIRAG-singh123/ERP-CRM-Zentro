import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChats,
  getChatById,
  getMessages,
  createGroup,
  updateGroup,
  deleteGroup,
  uploadGroupAvatar,
  addGroupMembers,
  removeGroupMember,
  createIndividualChat,
  clearChatHistory,
  markAsRead,
  searchChats,
} from '../../services/api/chat';
import type {
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateIndividualChatRequest,
  AddMembersRequest,
} from '../../types/chat';

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: getChats,
    staleTime: 30 * 1000, // 30 seconds - rely on socket updates instead of polling
    refetchInterval: false, // Disable polling - use socket events for real-time updates
    refetchOnWindowFocus: false, // Don't refetch on window focus - socket handles updates
    refetchOnMount: true, // Only refetch on mount to ensure initial data
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useChat(id: string | null) {
  return useQuery({
    queryKey: ['chat', id],
    queryFn: () => getChatById(id!),
    enabled: !!id,
    staleTime: 60 * 1000, // 60 seconds - rely on socket updates
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

export function useMessages(chatId: string | null, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['messages', chatId, params],
    queryFn: () => getMessages(chatId!, params),
    enabled: !!chatId,
    staleTime: 60 * 1000, // 60 seconds - rely on socket updates for real-time
    refetchOnWindowFocus: false, // Don't refetch on window focus - socket handles updates
    refetchInterval: false, // Disable polling - use socket events
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGroupRequest) => createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGroupRequest }) => updateGroup(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat', variables.id] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useAddGroupMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: AddMembersRequest }) =>
      addGroupMembers(groupId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat', variables.groupId] });
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      removeGroupMember(groupId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat', variables.groupId] });
    },
  });
}

export function useCreateIndividualChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIndividualChatRequest) => createIndividualChat(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useClearChatHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => clearChatHistory(chatId),
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => markAsRead(chatId),
    onSuccess: (_, chatId) => {
      // Optimistically update unread count to 0
      queryClient.setQueryData(['chats'], (old: any) => {
        if (!old?.chats) return old;

        const chatIndex = old.chats.findIndex((c: any) => c._id === chatId);
        if (chatIndex === -1) return old;

        const updatedChats = [...old.chats];
        const chat = { ...updatedChats[chatIndex] };
        chat.unreadCount = 0;
        updatedChats[chatIndex] = chat;

        return { ...old, chats: updatedChats };
      });

      // Also invalidate to sync with server
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    },
  });
}

export function useSearchChats(query: string) {
  return useQuery({
    queryKey: ['chatSearch', query],
    queryFn: () => searchChats(query),
    enabled: query.length > 0,
    staleTime: 5 * 1000,
  });
}

export function useUploadGroupAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, file }: { groupId: string; file: File }) =>
      uploadGroupAvatar(groupId, file),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat', variables.groupId] });
      // Optimistically update chat list with new avatar
      queryClient.setQueryData(['chats'], (old: any) => {
        if (!old?.chats) return old;
        const chatIndex = old.chats.findIndex((c: any) => c._id === variables.groupId);
        if (chatIndex === -1) return old;
        const updatedChats = [...old.chats];
        updatedChats[chatIndex] = { ...updatedChats[chatIndex], avatar: data.avatarUrl };
        return { ...old, chats: updatedChats };
      });
    },
  });
}

