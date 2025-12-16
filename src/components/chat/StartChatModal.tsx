import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { useCreateIndividualChat } from '../../hooks/queries/useChat';
import { useAllUsers } from '../../hooks/queries/useUsers';
import { UserAvatar } from '../common/UserAvatar';
import { useAuth } from '../../context/AuthContext';

interface StartChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export function StartChatModal({ isOpen, onClose, onChatCreated }: StartChatModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const createChatMutation = useCreateIndividualChat();
  const { data: usersData } = useAllUsers({ limit: 100 });

  // Filter users to only show admin and employees, exclude current user
  const availableUsers = (usersData?.users || []).filter(
    (u) => (u.role === 'admin' || u.role === 'employee') && u._id !== user?._id
  );

  // Filter by search query
  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleStartChat = async (userId: string) => {
    try {
      const result = await createChatMutation.mutateAsync({ userId });
      if (result.chat) {
        onChatCreated(result.chat._id);
        onClose();
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#B39CD0]" />
            Start New Chat
          </h2>
          <button
            onClick={onClose}
            disabled={createChatMutation.isPending}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all duration-200"
            />
          </div>

          {/* User List */}
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-white/60 text-sm">
                  {searchQuery.trim() ? 'No users found' : 'No users available'}
                </p>
              </div>
            ) : (
              filteredUsers.map((userItem) => (
                <button
                  key={userItem._id}
                  onClick={() => handleStartChat(userItem._id)}
                  disabled={createChatMutation.isPending}
                  className="w-full flex items-center gap-3 rounded-lg p-3 border border-transparent bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserAvatar
                    avatarUrl={userItem.profile?.avatar}
                    name={userItem.name}
                    email={userItem.email}
                    size={40}
                    className="border-white/20"
                  />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{userItem.name}</p>
                    <p className="text-xs text-white/60">{userItem.email}</p>
                    {userItem.role && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wide rounded bg-white/10 text-white/70">
                        {userItem.role}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

