import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { User } from '../../services/api/auth';
import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { UserEditForm } from '../../components/settings/UserEditForm';
import { UserAvatar } from '../../components/common/UserAvatar';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAllUsers, useUpdateUser, useDeleteUser } from '../../hooks/queries/useUsers';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export function SettingsUsersPage() {
  const { data, isLoading, isError, error } = useAllUsers();
  const users = data?.users ?? [];
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const { success, error: showError } = useToast();
  const { user: currentUser } = useAuth();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleEdit = (userId: string) => {
    const user = users.find((u) => u._id === userId);
    if (user) {
      setEditingUser(user);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleSave = async (values: { name: string; email: string; role: string; isActive: boolean }) => {
    if (!editingUser) return;
    try {
      await updateUserMutation.mutateAsync({ id: editingUser._id, data: values });
      success('User updated successfully');
      setEditingUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      showError(message);
    }
  };

  const handleDeleteClick = (userId: string) => {
    setDeletingUserId(userId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUserId) return;
    try {
      await deleteUserMutation.mutateAsync(deletingUserId);
      success('User deleted successfully');
      setDeletingUserId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      showError(message);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingUserId(null);
  };

  const getUserById = (userId: string) => {
    return users.find((u) => u._id === userId);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Users"
        description="Invite, suspend, and audit user access across workspaces."
        actions={
          <button className="flex items-center gap-2 rounded-full bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:scale-105 hover:bg-[#BCE7E5] active:scale-95">
            <Plus className="h-4 w-4" />
            Invite User
          </button>
        }
      />

      {isLoading && users.length === 0 ? (
        <DataGridPlaceholder columns={['Name', 'Email', 'Role', 'Status', 'Created']} />
      ) : users.length > 0 ? (
        <DataGrid
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (row) => {
                const user = row as User;
                return (
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={user.profile?.avatar}
                      name={user.name}
                      email={user.email}
                      size={40}
                    />
                    <span className="font-medium text-white">{user.name}</span>
                  </div>
                );
              },
            },
            { key: 'email', header: 'Email' },
            { 
              key: 'role', 
              header: 'Role',
              render: (row) => (
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70 transition-all duration-200 hover:bg-white/15">
                  {(row as User).role}
                </span>
              ),
            },
            {
              key: 'isActive',
              header: 'Status',
              render: (row) => (
                <span
                  className={`rounded-full px-2 py-1 text-xs transition-all duration-200 ${
                    (row as User).isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {(row as User).isActive ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'createdAt',
              header: 'Created',
              render: (row) =>
                new Date((row as User).createdAt).toLocaleDateString(),
            },
          ]}
          data={users}
          getRowId={(row) => (row as User)._id}
          actions={(row) => {
            const user = row as User;
            const isCurrentUser = currentUser?._id === user._id;

            return (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(user._id)}
                  disabled={updateUserMutation.isPending}
                  className="action-button action-button-edit disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Edit user"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(user._id)}
                  disabled={isCurrentUser || deleteUserMutation.isPending}
                  className="action-button action-button-delete disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isCurrentUser ? 'Cannot delete yourself' : 'Delete user'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          }}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50 animate-fade-in">
          {isError ? (error as Error).message : 'No users provisioned yet.'}
        </div>
      )}

      {editingUser && (
        <UserEditForm
          user={editingUser}
          isOpen={!!editingUser}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          isLoading={updateUserMutation.isPending}
        />
      )}

      {deletingUserId && (
        <ConfirmDialog
          title="Delete User"
          message={`Are you sure you want to delete ${getUserById(deletingUserId)?.name || 'this user'}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmVariant="danger"
        />
      )}
    </div>
  );
}

