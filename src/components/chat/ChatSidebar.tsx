import { useState, useEffect, useRef } from 'react';
import { Search, Plus, MessageCircle, UserPlus } from 'lucide-react';
import { ChatConversation } from './ChatConversation';
import { StartChatModal } from './StartChatModal';
import { useChats, useSearchChats } from '../../hooks/queries/useChat';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatWithMetadata, Message } from '../../types/chat';

interface ChatSidebarProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateGroup?: () => void;
}

export function ChatSidebar({ selectedChatId, onSelectChat, onCreateGroup }: ChatSidebarProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showStartChatModal, setShowStartChatModal] = useState(false);
  const { data: chatsData, isLoading } = useChats();
  const { data: searchData } = useSearchChats(searchQuery);
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const currentUserId = user?._id || '';

  // Use search results if searching, otherwise use all chats
  const chats = searchQuery.trim()
    ? (searchData?.chats as ChatWithMetadata[] | undefined) || []
    : chatsData?.chats || [];

  // Use refs for stable function references
  const queryClientRef = useRef(queryClient);
  const currentUserIdRef = useRef(currentUserId);
  const selectedChatIdRef = useRef(selectedChatId);

  // Update refs when values change
  useEffect(() => {
    queryClientRef.current = queryClient;
    currentUserIdRef.current = currentUserId;
    selectedChatIdRef.current = selectedChatId;
  }, [queryClient, currentUserId, selectedChatId]);

  // Listen to socket events for real-time updates with optimistic cache updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      // Handle both string and object chatId
      const messageChatId = typeof message.chatId === 'object' && message.chatId !== null
        ? (message.chatId as any)._id || message.chatId
        : message.chatId;
      
      const qc = queryClientRef.current;
      const cuid = currentUserIdRef.current;
      const scid = selectedChatIdRef.current;
      
      // Optimistically update chat list cache
      qc.setQueryData(['chats'], (old: any) => {
        if (!old?.chats) {
          // If no old data, invalidate to refetch
          qc.invalidateQueries({ queryKey: ['chats'] });
          return old;
        }

        const chatIndex = old.chats.findIndex((c: ChatWithMetadata) => c._id === messageChatId);
        if (chatIndex === -1) {
          // Chat not in list, invalidate to refetch
          qc.invalidateQueries({ queryKey: ['chats'] });
          return old;
        }

        const updatedChats = [...old.chats];
        const chat = { ...updatedChats[chatIndex] };

        // Update last message
        chat.lastMessage = message;
        chat.updatedAt = new Date().toISOString();

        // Get sender ID
        const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;

        // Increment unread count if:
        // 1. Message is not from current user
        // 2. Chat is not currently selected (user is not viewing it)
        if (senderId !== cuid && scid !== messageChatId) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        // Move chat to top (most recent)
        updatedChats.splice(chatIndex, 1);
        updatedChats.unshift(chat);

        return { ...old, chats: updatedChats };
      });

      // Also invalidate to sync with server
      qc.invalidateQueries({ queryKey: ['chats'] });
    };

    const handleChatUpdated = (data: { chatId: string; lastMessage?: Message }) => {
      const qc = queryClientRef.current;
      if (data.lastMessage) {
        // Use the same logic as handleNewMessage
        handleNewMessage(data.lastMessage);
      } else {
        // Just invalidate if no message data
        qc.invalidateQueries({ queryKey: ['chats'] });
      }
    };

    const handleChatDeleted = (data: { chatId: string }) => {
      const qc = queryClientRef.current;
      // Remove chat from cache
      qc.setQueryData(['chats'], (old: any) => {
        if (!old?.chats) return old;
        return {
          ...old,
          chats: old.chats.filter((c: ChatWithMetadata) => c._id !== data.chatId),
        };
      });
    };

    const handleMessagesRead = (data: { chatId: string; userId: string }) => {
      const qc = queryClientRef.current;
      const cuid = currentUserIdRef.current;
      const scid = selectedChatIdRef.current;
      
      // Update unread count when messages are read
      // Always update if it's the current user who read, or if we're viewing this chat
      qc.setQueryData(['chats'], (old: any) => {
        if (!old?.chats) return old;

        const chatIndex = old.chats.findIndex((c: ChatWithMetadata) => c._id === data.chatId);
        if (chatIndex === -1) return old;

        const updatedChats = [...old.chats];
        const chat = { ...updatedChats[chatIndex] };

        // Reset unread count when messages are read by current user or when viewing the chat
        if (data.userId === cuid || data.chatId === scid) {
          chat.unreadCount = 0;
        }

        updatedChats[chatIndex] = chat;
        return { ...old, chats: updatedChats };
      });

      // Also invalidate to sync with server
      qc.invalidateQueries({ queryKey: ['chats'] });
    };

    const handleGroupAvatarUpdated = (data: { chatId: string; avatar: string; group?: any }) => {
      const qc = queryClientRef.current;
      
      // Update chat list with new avatar
      qc.setQueryData(['chats'], (old: any) => {
        if (!old?.chats) {
          qc.invalidateQueries({ queryKey: ['chats'] });
          return old;
        }

        const chatIndex = old.chats.findIndex((c: ChatWithMetadata) => c._id === data.chatId);
        if (chatIndex === -1) {
          qc.invalidateQueries({ queryKey: ['chats'] });
          return old;
        }

        const updatedChats = [...old.chats];
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          avatar: data.avatar,
        };

        return { ...old, chats: updatedChats };
      });

      // Also update individual chat cache if it exists
      qc.setQueryData(['chat', data.chatId], (old: any) => {
        if (!old?.chat) return old;
        return {
          ...old,
          chat: {
            ...old.chat,
            avatar: data.avatar,
          },
        };
      });

      // Invalidate to ensure sync
      qc.invalidateQueries({ queryKey: ['chats'] });
      qc.invalidateQueries({ queryKey: ['chat', data.chatId] });
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('chatUpdated', handleChatUpdated);
    socket.on('chatDeleted', handleChatDeleted);
    socket.on('messagesRead', handleMessagesRead);
    socket.on('messageNotification', handleNewMessage);
    socket.on('groupAvatarUpdated', handleGroupAvatarUpdated);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('chatUpdated', handleChatUpdated);
      socket.off('chatDeleted', handleChatDeleted);
      socket.off('messagesRead', handleMessagesRead);
      socket.off('messageNotification', handleNewMessage);
      socket.off('groupAvatarUpdated', handleGroupAvatarUpdated);
    };
  }, [socket]);

  return (
    <div className="flex h-full w-80 flex-col border-r border-white/10 bg-gradient-to-b from-[#1A1A1C] to-[#1A1A1C]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#1A1A1C]/95 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#B39CD0]" />
            Chats
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStartChatModal(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-300 hover:bg-white/20 hover:scale-110 hover:shadow-md"
              title="Start New Chat"
            >
              <UserPlus className="h-4 w-4" />
            </button>
            {onCreateGroup && (
              <button
                onClick={onCreateGroup}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#B39CD0] to-[#A68BC7] text-[#1A1A1C] transition-all duration-300 hover:from-[#C3ADD9] hover:to-[#B39CD0] hover:scale-110 hover:shadow-lg hover:shadow-[#B39CD0]/30"
                title="Create Group"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#B39CD0]/50 focus:bg-white/10 focus:outline-none focus:shadow-md focus:shadow-[#B39CD0]/10 transition-all duration-300"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="mb-4 text-white/60">Loading chats...</div>
              <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/3 animate-pulse bg-[#B39CD0]"></div>
              </div>
            </div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-white/60 text-center">
              {searchQuery.trim() ? 'No chats found' : 'No chats yet'}
            </p>
          </div>
        ) : (
          chats.map((chat) => (
            <ChatConversation
              key={chat._id}
              chat={chat}
              isSelected={selectedChatId === chat._id}
              onClick={() => onSelectChat(chat._id)}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      {/* Start Chat Modal */}
      <StartChatModal
        isOpen={showStartChatModal}
        onClose={() => setShowStartChatModal(false)}
        onChatCreated={(chatId) => {
          onSelectChat(chatId);
          setShowStartChatModal(false);
        }}
      />
    </div>
  );
}

