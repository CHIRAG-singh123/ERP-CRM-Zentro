import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { X, Users, Trash2 } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useCreateGroup, useUpdateGroup, useDeleteGroup, useRemoveGroupMember, useUploadGroupAvatar } from '../../hooks/queries/useChat';
import { useAllUsers } from '../../hooks/queries/useUsers';
import { UserAvatar } from '../common/UserAvatar';
import { GroupAvatarUploader } from './GroupAvatarUploader';
import type { ChatGroup } from '../../types/chat';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: ChatGroup | null;
}

const groupSchema = Yup.object({
  name: Yup.string().required('Group name is required').max(100, 'Name must be less than 100 characters'),
  description: Yup.string().max(500, 'Description must be less than 500 characters'),
});

export function GroupManagementModal({ isOpen, onClose, group }: GroupManagementModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>(group?.members.map(m => typeof m === 'object' ? m._id : m) || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const createMutation = useCreateGroup();
  const updateMutation = useUpdateGroup();
  const deleteMutation = useDeleteGroup();
  const removeMemberMutation = useRemoveGroupMember();
  const uploadAvatarMutation = useUploadGroupAvatar();
  const { data: usersData } = useAllUsers({ limit: 100 });

  // Filter users to only show admin and employees (exclude customers and other roles)
  const users = (usersData?.users || []).filter(
    (user) => user.role === 'admin' || user.role === 'employee'
  );
  const isEditMode = !!group;

  const formik = useFormik({
    initialValues: {
      name: group?.name || '',
      description: group?.description || '',
    },
    validationSchema: groupSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        if (isEditMode && group) {
          await updateMutation.mutateAsync({
            id: group._id,
            data: values,
          });
          // Upload avatar if selected
          if (avatarFile) {
            await uploadAvatarMutation.mutateAsync({
              groupId: group._id,
              file: avatarFile,
            });
          }
        } else {
          const result = await createMutation.mutateAsync({
            ...values,
            members: selectedMembers,
          });
          // Upload avatar if selected for new group
          if (avatarFile && result.chat) {
            await uploadAvatarMutation.mutateAsync({
              groupId: result.chat._id,
              file: avatarFile,
            });
          }
        }
        setAvatarFile(null);
        onClose();
      } catch (error) {
        console.error('Error saving group:', error);
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (group) {
        setSelectedMembers(group.members.map(m => typeof m === 'object' ? m._id : m));
      }
    } else {
      document.body.style.overflow = '';
      setSelectedMembers([]);
      setShowDeleteConfirm(false);
      setAvatarFile(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, group]);

  const handleAvatarUpload = async (file: File) => {
    setAvatarFile(file);
    // If editing existing group, upload immediately
    if (group) {
      try {
        await uploadAvatarMutation.mutateAsync({
          groupId: group._id,
          file,
        });
      } catch (error) {
        console.error('Error uploading avatar:', error);
        setAvatarFile(null);
      }
    }
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    // TODO: Add API call to remove avatar if needed
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRemoveMember = async (userId: string) => {
    if (group) {
      try {
        await removeMemberMutation.mutateAsync({
          groupId: group._id,
          userId,
        });
        setSelectedMembers((prev) => prev.filter((id) => id !== userId));
      } catch (error) {
        console.error('Error removing member:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (group) {
      try {
        await deleteMutation.mutateAsync(group._id);
        onClose();
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };

  if (!isOpen) return null;

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || uploadAvatarMutation.isPending;

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
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#B39CD0]" />
            {isEditMode ? 'Edit Group' : 'Create Group'}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            {/* Group Avatar */}
            <GroupAvatarUploader
              avatarUrl={group?.avatar}
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
              size={100}
            />

            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[#B39CD0]/50 focus:bg-white/10 focus:outline-none focus:shadow-md focus:shadow-[#B39CD0]/10 transition-all duration-300"
                placeholder="Enter group name"
                disabled={isLoading}
              />
              {formik.touched.name && formik.errors.name && (
                <p className="mt-1 text-xs text-red-400">{formik.errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-[#B39CD0]/50 focus:bg-white/10 focus:outline-none focus:shadow-md focus:shadow-[#B39CD0]/10 transition-all duration-300 resize-none"
                placeholder="Enter group description (optional)"
                disabled={isLoading}
              />
              {formik.touched.description && formik.errors.description && (
                <p className="mt-1 text-xs text-red-400">{formik.errors.description}</p>
              )}
            </div>

            {/* Members */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                {isEditMode ? 'Group Members' : 'Add Members'}
              </label>
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-white/10 bg-white/5 p-4 scroll-smooth">
                {users.length === 0 ? (
                  <p className="text-white/60 text-sm">No users available</p>
                ) : (
                  users.map((user) => {
                    const isSelected = selectedMembers.includes(user._id);
                    const isInGroup = isEditMode && group?.members.some(
                      m => (typeof m === 'object' ? m._id : m) === user._id
                    );

                    return (
                      <div
                        key={user._id}
                        className={`flex items-center justify-between rounded-lg p-2 transition-all duration-300 ${
                          isSelected || isInGroup
                            ? 'bg-white/10 border border-[#B39CD0]/30 shadow-sm'
                            : 'hover:bg-white/8 border border-transparent hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            avatarUrl={user.profile?.avatar}
                            name={user.name}
                            email={user.email}
                            size={32}
                          />
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-white/60">{user.email}</p>
                          </div>
                        </div>
                        {isEditMode && isInGroup ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(user._id)}
                            disabled={isLoading}
                            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                            title="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleMember(user._id)}
                            disabled={isLoading}
                            className={`h-5 w-5 rounded border-2 transition-all duration-300 flex items-center justify-center ${
                              isSelected
                                ? 'bg-gradient-to-br from-[#B39CD0] to-[#A68BC7] border-[#B39CD0] shadow-sm'
                                : 'border-white/30 hover:border-white/50'
                            } disabled:opacity-50`}
                          >
                            {isSelected && <span className="text-[#1A1A1C] text-xs">✓</span>}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Delete Button (Edit Mode) */}
            {isEditMode && (
              <div className="pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Group
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="border-t border-white/10 p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => formik.handleSubmit()}
              disabled={isLoading || !formik.isValid}
              className="rounded-lg bg-gradient-to-r from-[#B39CD0] to-[#A68BC7] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-300 hover:from-[#C3ADD9] hover:to-[#B39CD0] hover:scale-105 hover:shadow-lg hover:shadow-[#B39CD0]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? 'Saving...' : isEditMode ? 'Update Group' : 'Create Group'}
            </button>
          </div>
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
          Are you sure you want to delete this group? This action cannot be undone.
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
            {isLoading ? 'Deleting...' : 'Delete'}
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

