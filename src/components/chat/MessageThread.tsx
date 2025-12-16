import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useMessages, useMarkAsRead } from '../../hooks/queries/useChat';
import { useSocket } from '../../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import type { Message } from '../../types/chat';
import { useAuth } from '../../context/AuthContext';
import { getDateSeparator, isSameDay } from '../../utils/formatting';

interface MessageThreadProps {
  chatId: string | null;
}

export function MessageThread({ chatId }: MessageThreadProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { data: messagesData, isLoading } = useMessages(chatId);
  const { sendMessage, joinChat, markMessageAsRead, socket } = useSocket();
  
  // Join chat when chatId changes and socket is available
  useEffect(() => {
    if (chatId && socket?.connected) {
      joinChat(chatId);
    }
  }, [chatId, socket, joinChat]);
  const markAsReadMutation = useMarkAsRead();
  const queryClient = useQueryClient();

  const messages = messagesData?.messages || [];
  const currentUserId = user?._id || '';

  // Mark as read when chat is opened
  useEffect(() => {
    if (chatId) {
      // Optimistically update unread count to 0 when chat is opened
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

      // Mark as read on server
      markAsReadMutation.mutate(chatId);
    }
  }, [chatId, markAsReadMutation, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Socket event listeners - use refs for stable function references
  const queryClientRef = useRef(queryClient);
  const currentUserIdRef = useRef(currentUserId);
  const chatIdRef = useRef(chatId);
  const markMessageAsReadRef = useRef(markMessageAsRead);
  const messagesEndRefStable = useRef(messagesEndRef.current);

  // Update refs when values change
  useEffect(() => {
    queryClientRef.current = queryClient;
    currentUserIdRef.current = currentUserId;
    chatIdRef.current = chatId;
    markMessageAsReadRef.current = markMessageAsRead;
    messagesEndRefStable.current = messagesEndRef.current;
  }, [queryClient, currentUserId, chatId, markMessageAsRead]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !chatId) return;

    const handleNewMessage = (message: Message) => {
      // Handle both string and object chatId
      const messageChatId = typeof message.chatId === 'object' && message.chatId !== null 
        ? (message.chatId as any)._id || message.chatId 
        : message.chatId;
      
      if (messageChatId === chatIdRef.current) {
        const qc = queryClientRef.current;
        const cid = chatIdRef.current;
        const cuid = currentUserIdRef.current;
        
        qc.setQueryData(['messages', cid], (old: any) => {
          if (!old) {
            // If no old data, refetch
            qc.invalidateQueries({ queryKey: ['messages', cid] });
            return old;
          }
          
          // Check if message already exists by ID
          const existingIndex = old.messages.findIndex((m: Message) => m._id === message._id);
          if (existingIndex !== -1) {
            // Replace existing message (might be optimistic)
            const updatedMessages = [...old.messages];
            updatedMessages[existingIndex] = message;
            return {
              ...old,
              messages: updatedMessages,
            };
          }
          
          // Check if there's an optimistic message with same content from same sender
          const optimisticIndex = old.messages.findIndex((m: Message) => {
            const mSenderId = typeof m.senderId === 'object' ? m.senderId._id : m.senderId;
            const msgSenderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
            return m._id?.startsWith('temp-') && 
                   m.content === message.content && 
                   mSenderId === msgSenderId &&
                   Math.abs(new Date(m.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000; // Within 5 seconds
          });
          
          if (optimisticIndex !== -1) {
            // Replace optimistic message with real one
            const updatedMessages = [...old.messages];
            updatedMessages[optimisticIndex] = message;
            return {
              ...old,
              messages: updatedMessages,
            };
          }
          
          // Add new message
          return {
            ...old,
            messages: [...old.messages, message],
          };
        });
        
        // Optimistically update chat list cache
        qc.setQueryData(['chats'], (old: any) => {
          if (!old?.chats) {
            qc.invalidateQueries({ queryKey: ['chats'] });
            return old;
          }

          const chatIndex = old.chats.findIndex((c: any) => c._id === cid);
          if (chatIndex === -1) {
            qc.invalidateQueries({ queryKey: ['chats'] });
            return old;
          }

          const updatedChats = [...old.chats];
          const chat = { ...updatedChats[chatIndex] };
          chat.lastMessage = message;
          chat.updatedAt = new Date().toISOString();

          // Don't increment unread count since we're viewing this chat
          // The unread count should already be 0 when viewing

          // Move to top
          updatedChats.splice(chatIndex, 1);
          updatedChats.unshift(chat);

          return { ...old, chats: updatedChats };
        });

        // Also invalidate to sync with server
        qc.invalidateQueries({ queryKey: ['chats'] });
        
        // Mark as read if it's not from current user and we're viewing the chat
        const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
        if (senderId !== cuid && cid) {
          markMessageAsReadRef.current(message._id, cid);
        }
        
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          if (messagesEndRefStable.current) {
            messagesEndRefStable.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    const handleMessageDeleted = (data: { messageId: string; chatId: string }) => {
      if (data.chatId === chatIdRef.current) {
        const qc = queryClientRef.current;
        const cid = chatIdRef.current;
        qc.setQueryData(['messages', cid], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.filter((m: Message) => m._id !== data.messageId),
          };
        });
        qc.invalidateQueries({ queryKey: ['chats'] });
      }
    };

    const handleUserTyping = (data: { userId: string; userName: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userName);
        } else {
          next.delete(data.userName);
        }
        return next;
      });
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('userTyping', handleUserTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket, chatId]);

  const handleSendMessage = (content: string) => {
    if (chatId) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Optimistically add message to UI immediately
      const optimisticMessage: Message = {
        _id: tempId,
        chatId,
        senderId: currentUserId,
        content,
        type: 'text',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        readBy: [],
      };
      
      queryClient.setQueryData(['messages', chatId], (old: any) => {
        if (!old) {
          // If no old data, create new structure
          return {
            messages: [optimisticMessage],
            total: 1,
            page: 1,
            limit: 50,
          };
        }
        
        // Check if optimistic message already exists
        const exists = old.messages.some((m: Message) => m._id === tempId);
        if (exists) return old;
        
        return {
          ...old,
          messages: [...old.messages, optimisticMessage],
        };
      });
      
      // Update chat list immediately
      queryClient.setQueryData(['chats'], (old: any) => {
        if (!old?.chats) return old;
        
        const chatIndex = old.chats.findIndex((c: any) => c._id === chatId);
        if (chatIndex === -1) return old;
        
        const updatedChats = [...old.chats];
        const chat = { ...updatedChats[chatIndex] };
        chat.lastMessage = optimisticMessage;
        chat.updatedAt = new Date().toISOString();
        
        // Move to top
        updatedChats.splice(chatIndex, 1);
        updatedChats.unshift(chat);
        
        return { ...old, chats: updatedChats };
      });
      
      // Scroll to bottom immediately
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
      
      // Send message via socket
      sendMessage({
        chatId,
        content,
        type: 'text',
      });
    }
  };

  if (!chatId) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#1A1A1C] via-[#1A1A1C] to-[#1A1A1C]/80">
        <p className="text-white/60">Select a chat to start messaging</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#1A1A1C] via-[#1A1A1C] to-[#1A1A1C]/80">
        <div className="text-center">
          <div className="mb-4 text-white/60">Loading messages...</div>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse bg-gradient-to-r from-[#B39CD0] to-[#A68BC7]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#1A1A1C]">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center px-6">
              <div className="mb-3 flex justify-center">
                <div className="rounded-full bg-white/5 p-4 border border-white/10">
                  <MessageCircle className="h-8 w-8 text-[#B39CD0]/50" />
                </div>
              </div>
              <p className="text-white/70 font-medium mb-1">No messages yet</p>
              <p className="text-sm text-white/50">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const isOwn =
                (typeof message.senderId === 'object' ? message.senderId._id : message.senderId) ===
                currentUserId;
              const showAvatar =
                !prevMessage ||
                (typeof prevMessage.senderId === 'object'
                  ? prevMessage.senderId._id
                  : prevMessage.senderId) !==
                  (typeof message.senderId === 'object' ? message.senderId._id : message.senderId) ||
                new Date(message.createdAt).getTime() -
                  new Date(prevMessage.createdAt).getTime() >
                  300000; // 5 minutes

              // Show date separator if this is first message or different day from previous
              const showDateSeparator =
                !prevMessage || !isSameDay(message.createdAt, prevMessage.createdAt);

              return (
                <div key={message._id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-white/10"></div>
                        <span className="text-xs text-white/40 px-2 font-medium">
                          {getDateSeparator(message.createdAt)}
                        </span>
                        <div className="h-px flex-1 bg-white/10"></div>
                      </div>
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    showTimestamp={index === messages.length - 1 || showAvatar}
                  />
                </div>
              );
            })}
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-white/60 px-2 animate-pulse">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-[#B39CD0] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 rounded-full bg-[#B39CD0] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-2 w-2 rounded-full bg-[#B39CD0] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>{Array.from(typingUsers).join(', ')}</span>
                <span className="italic">is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <MessageInput chatId={chatId} onSend={handleSendMessage} />
    </div>
  );
}

