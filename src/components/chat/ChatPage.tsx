import { useState, useEffect, useRef } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { MessageThread } from './MessageThread';
import { GroupManagementModal } from './GroupManagementModal';
import { GroupInfoModal } from './GroupInfoModal';
import { ClearHistoryDialog } from './ClearHistoryDialog';
import { Trash2, MessageCircle, Wifi, WifiOff, Loader2, MoreVertical, Edit2, Info } from 'lucide-react';
import { useChat } from '../../hooks/queries/useChat';
import { useClearChatHistory } from '../../hooks/queries/useChat';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { UserAvatar } from '../common/UserAvatar';

export function ChatPage() {
  const { user } = useAuth();
  const { connectionStatus, isConnected } = useSocket();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const { data: chatData } = useChat(selectedChatId);
  const clearHistoryMutation = useClearChatHistory();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const selectedChatIdRef = useRef(selectedChatId);

  const chat = chatData?.chat;
  const isGroupCreator = chat?.type === 'group' && 
    (typeof chat.createdBy === 'object' ? chat.createdBy._id : chat.createdBy) === user?._id;

  // Update ref when selectedChatId changes
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Listen for group avatar updates
  useEffect(() => {
    if (!socket) return;

    const handleGroupAvatarUpdated = (data: { chatId: string; avatar: string; group?: any }) => {
      // Update chat cache
      queryClient.setQueryData(['chat', data.chatId], (old: any) => {
        if (!old?.chat) return old;
        return {
          ...old,
          chat: {
            ...old.chat,
            avatar: data.avatar,
          },
        };
      });

      // Update chat list
      queryClient.setQueryData(['chats'], (old: any) => {
        if (!old?.chats) return old;
        const chatIndex = old.chats.findIndex((c: any) => c._id === data.chatId);
        if (chatIndex === -1) return old;
        const updatedChats = [...old.chats];
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          avatar: data.avatar,
        };
        return { ...old, chats: updatedChats };
      });

      // Invalidate to ensure sync
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat', data.chatId] });
    };

    socket.on('groupAvatarUpdated', handleGroupAvatarUpdated);

    return () => {
      socket.off('groupAvatarUpdated', handleGroupAvatarUpdated);
    };
  }, [socket, queryClient]);

  // Get connection status display
  const getConnectionStatus = () => {
    if (isConnected && connectionStatus === 'connected') {
      return { icon: Wifi, text: 'Connected', color: 'text-green-500' };
    } else if (connectionStatus === 'connecting') {
      return { icon: Loader2, text: 'Connecting...', color: 'text-yellow-500', animate: true };
    } else if (connectionStatus === 'error') {
      return { icon: WifiOff, text: 'Connection Error', color: 'text-red-500' };
    } else {
      return { icon: WifiOff, text: 'Disconnected', color: 'text-gray-500' };
    }
  };

  const connectionInfo = getConnectionStatus();
  const ConnectionIcon = connectionInfo.icon;

  const handleClearHistory = () => {
    if (selectedChatId) {
      clearHistoryMutation.mutate(selectedChatId, {
        onSuccess: () => {
          setShowClearHistoryDialog(false);
        },
      });
    }
  };

  // Get display name and avatar for the chat header
  const getChatDisplayInfo = () => {
    if (!chat) return { name: '', avatar: null };
    
    if (chat.type === 'individual') {
      const otherMember = chat.members.find(
        (m) => (typeof m === 'object' ? m._id : m) !== user?._id
      );
      if (otherMember && typeof otherMember === 'object') {
        return {
          name: otherMember.name,
          avatar: otherMember.profile?.avatar,
        };
      }
    }
    
    return {
      name: chat.name,
      avatar: chat.avatar,
    };
  };

  const displayInfo = getChatDisplayInfo();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#242426]">
      <ChatSidebar
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onCreateGroup={() => setShowGroupModal(true)}
      />
      <div className="flex flex-1 flex-col">
        {selectedChatId && chat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1A1A1C] to-[#1A1A1C]/95 backdrop-blur-sm px-6 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={displayInfo.avatar}
                  name={displayInfo.name}
                  size={40}
                  className="border-white/20"
                />
                <div>
                  <h3 className="font-semibold text-white">{displayInfo.name}</h3>
                  {chat.type === 'group' && (
                    <p className="text-xs text-white/60">{chat.members.length} members</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Connection Status Indicator */}
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <ConnectionIcon 
                    className={`h-3.5 w-3.5 ${connectionInfo.color} ${connectionInfo.animate ? 'animate-spin' : ''}`} 
                  />
                  <span className={`text-xs ${connectionInfo.color} font-medium`}>
                    {connectionInfo.text}
                  </span>
                </div>
                
                {/* Group Info Button (for groups) */}
                {chat.type === 'group' && (
                  <button
                    onClick={() => setShowGroupInfoModal(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-all duration-300 hover:bg-white/10 hover:text-white hover:scale-110"
                    title="Group Info"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
                
                {/* Group Menu (for group creators) */}
                {isGroupCreator && (
                  <div className="relative">
                    <button
                      onClick={() => setShowGroupMenu(!showGroupMenu)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-all duration-300 hover:bg-white/10 hover:text-white hover:scale-110"
                      title="Group Options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {showGroupMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowGroupMenu(false)}
                        />
                        <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-white/10 bg-[#1A1A1C] shadow-xl">
                          <button
                            onClick={() => {
                              setShowGroupModal(true);
                              setShowGroupMenu(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit Group
                          </button>
                          <button
                            onClick={() => {
                              setShowClearHistoryDialog(true);
                              setShowGroupMenu(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            Clear History
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {/* Clear History Button (for non-group or non-creators) */}
                {(!isGroupCreator || chat.type !== 'group') && (
                  <button
                    onClick={() => setShowClearHistoryDialog(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-all duration-300 hover:bg-white/10 hover:text-white hover:scale-110"
                    title="Clear History"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <MessageThread chatId={selectedChatId} />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#1A1A1C] via-[#1A1A1C] to-[#1A1A1C]/80">
            <div className="text-center px-6">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-white/5 p-6 border border-white/10">
                  <MessageCircle className="h-12 w-12 text-[#B39CD0]/50" />
                </div>
              </div>
              <p className="text-white/80 mb-2 text-lg font-semibold">Welcome to Chat</p>
              <p className="text-sm text-white/50">Select a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      <GroupManagementModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        group={chat?.type === 'group' ? chat : null}
      />

      {chat?.type === 'group' && (
        <GroupInfoModal
          isOpen={showGroupInfoModal}
          onClose={() => setShowGroupInfoModal(false)}
          group={chat}
          onEdit={() => {
            setShowGroupInfoModal(false);
            setShowGroupModal(true);
          }}
        />
      )}

      <ClearHistoryDialog
        isOpen={showClearHistoryDialog}
        onClose={() => setShowClearHistoryDialog(false)}
        onConfirm={handleClearHistory}
        isLoading={clearHistoryMutation.isPending}
      />
    </div>
  );
}

