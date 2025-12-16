import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X, Users, Calendar, User, Trash2, Edit2 } from 'lucide-react';
import { useDeleteGroup } from '../../hooks/queries/useChat';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import { getImageUrl } from '../../utils/imageUtils';
import type { ChatGroup } from '../../types/chat';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: ChatGroup;
  onEdit: () => void;
}

export function GroupInfoModal({ isOpen, onClose, group, onEdit }: GroupInfoModalProps) {
  const { user } = useAuth();
  const deleteMutation = useDeleteGroup();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isGroupCreator = 
    (typeof group.createdBy === 'object' ? group.createdBy._id : group.createdBy) === user?._id;

  const createdByUser = typeof group.createdBy === 'object' 
    ? group.createdBy 
    : null;

  const members = group.members.filter((m) => {
    const memberId = typeof m === 'object' ? m._id : m;
    return memberId !== user?._id;
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setShowDeleteConfirm(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(group._id);
      onClose();
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  const isLoading = deleteMutation.isPending;
  const groupAvatarUrl = group.avatar ? getImageUrl(group.avatar) : null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#B39CD0]" />
            Group Info
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Group Avatar and Name */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b border-white/10">
            <div className="relative">
              {groupAvatarUrl ? (
                <img
                  src={groupAvatarUrl}
                  alt={group.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#B39CD0] to-[#A68BC7] flex items-center justify-center border-4 border-white/20">
                  <Users className="h-16 w-16 text-white/80" />
                </div>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-1">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-white/60 max-w-md">{group.description}</p>
              )}
            </div>
          </div>

          {/* Group Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/80">
              <Calendar className="h-5 w-5 text-[#B39CD0]" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-xs text-white/60">{formatDate(group.createdAt)}</p>
              </div>
            </div>

            {createdByUser && (
              <div className="flex items-center gap-3 text-white/80">
                <User className="h-5 w-5 text-[#B39CD0]" />
                <div className="flex items-center gap-2">
                  <UserAvatar
                    avatarUrl={createdByUser.profile?.avatar}
                    name={createdByUser.name}
                    size={24}
                  />
                  <div>
                    <p className="text-sm font-medium">Created by</p>
                    <p className="text-xs text-white/60">{createdByUser.name}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-white/80">
              <Users className="h-5 w-5 text-[#B39CD0]" />
              <div>
                <p className="text-sm font-medium">Members</p>
                <p className="text-xs text-white/60">{group.members.length} members</p>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-sm font-semibold text-white/80 mb-3">Group Members</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Current User */}
              <div className="flex items-center gap-3 rounded-lg p-2 bg-white/5">
                <UserAvatar
                  avatarUrl={user?.profile?.avatar}
                  name={user?.name || ''}
                  email={user?.email}
                  size={40}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-white/60">{user?.email}</p>
                </div>
                <span className="text-xs text-[#B39CD0] font-medium">You</span>
              </div>

              {/* Other Members */}
              {members.map((member) => {
                const memberObj = typeof member === 'object' ? member : null;
                if (!memberObj) return null;

                return (
                  <div
                    key={memberObj._id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5 transition-colors"
                  >
                    <UserAvatar
                      avatarUrl={memberObj.profile?.avatar}
                      name={memberObj.name}
                      email={memberObj.email}
                      size={40}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{memberObj.name}</p>
                      <p className="text-xs text-white/60">{memberObj.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions (for group creator) */}
          {isGroupCreator && (
            <div className="pt-4 border-t border-white/10 flex gap-3">
              <button
                onClick={onEdit}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 hover:scale-105 disabled:opacity-50"
              >
                <Edit2 className="h-4 w-4" />
                Edit Group
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/20 hover:scale-105 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const deleteConfirmContent = showDeleteConfirm ? (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowDeleteConfirm(false);
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1C] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Delete Group</h3>
        <p className="text-white/70 mb-6">
          Are you sure you want to delete "{group.name}"? This action cannot be undone. All messages and members will be removed.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isLoading}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600"
          >
            {isLoading ? 'Deleting...' : 'Delete Group'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {createPortal(modalContent, document.body)}
      {showDeleteConfirm && createPortal(deleteConfirmContent, document.body)}
    </>
  );
}

