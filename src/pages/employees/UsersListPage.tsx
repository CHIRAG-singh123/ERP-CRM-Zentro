import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Edit, Trash2, Ban, CheckCircle, X, Eye, EyeOff } from 'lucide-react';
import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { AvatarUploader } from '../../components/settings/AvatarUploader';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useAllUsers, useUpdateUser, useDeleteUser, useToggleUserStatus, useUploadUserAvatar } from '../../hooks/queries/useUsers';
import { logger } from '../../utils/logger';
import type { User } from '../../services/api/auth';

interface UserFormData {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  password: string;
  profile: {
    timezone: string;
    companyInfo: string;
    avatar: string;
  };
}

export function UsersListPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'customer',
    isActive: true,
    password: '',
    profile: {
      timezone: 'UTC',
      companyInfo: '',
      avatar: '',
    },
  });

  const { data, isLoading } = useAllUsers({
    page: 1,
    limit: 50,
    search,
    role: roleFilter || undefined,
    isActive: statusFilter,
  });

  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const toggleStatusMutation = useToggleUserStatus();
  const uploadAvatarMutation = useUploadUserAvatar();

  const users = data?.users ?? [];

  // Body scroll lock when modal is open
  useEffect(() => {
    if (showEditModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showEditModal]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: '',
      profile: {
        timezone: user.profile?.timezone || 'UTC',
        companyInfo: user.profile?.companyInfo || '',
        avatar: user.profile?.avatar || '',
      },
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        profile: {
          timezone: formData.profile.timezone,
          companyInfo: formData.profile.companyInfo,
        },
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      if (formData.profile.avatar) {
        updateData.profile.avatar = formData.profile.avatar;
      }

      await updateMutation.mutateAsync({ id: editingUser._id, data: updateData });
      setShowEditModal(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      logger.error('Error updating user:', error);
      alert('Error updating user. Please try again.');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(userId);
    } catch (error) {
      logger.error('Error deleting user:', error);
      alert('Error deleting user. Please try again.');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await toggleStatusMutation.mutateAsync(userId);
    } catch (error) {
      logger.error('Error toggling user status:', error);
      alert('Error updating user status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'customer',
      isActive: true,
      password: '',
      profile: {
        timezone: 'UTC',
        companyInfo: '',
        avatar: '',
      },
    });
    setShowPassword(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description={isAdmin ? "Manage all users in the system" : "View all users in the system (read-only)."}
      />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#B39CD0] focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-sm text-white focus:border-[#B39CD0] focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
          <option value="customer">Customer</option>
        </select>
        {isAdmin && (
          <select
            value={statusFilter === undefined ? '' : statusFilter.toString()}
            onChange={(e) => setStatusFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-sm text-white focus:border-[#B39CD0] focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        )}
      </div>

      {/* Data Grid */}
      {isLoading && users.length === 0 ? (
        <DataGridPlaceholder columns={['Name', 'Email', 'Role', 'Status', 'Created', isAdmin ? 'Actions' : '']} rows={5} />
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
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">
                  {(row as { role: string }).role}
                </span>
              ),
            },
            {
              key: 'isActive',
              header: 'Status',
              render: (row) => (
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    (row as { isActive: boolean }).isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {(row as { isActive: boolean }).isActive ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'createdAt',
              header: 'Created',
              render: (row) =>
                new Date((row as { createdAt: string }).createdAt).toLocaleDateString(),
            },
            ...(isAdmin
              ? [
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (row: unknown) => {
                      const user = row as User;
                      const isCurrentUser = user._id === currentUser?._id;
                      
                      return (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user._id)}
                            disabled={isCurrentUser || toggleStatusMutation.isPending}
                            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-yellow-400 disabled:opacity-50"
                            title={user.isActive ? 'Block User' : 'Activate User'}
                          >
                            {user.isActive ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            disabled={isCurrentUser || deleteMutation.isPending}
                            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-red-400 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    },
                  },
                ]
              : []),
          ]}
          data={users}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          No users found.
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && isAdmin &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEditModal(false);
                setEditingUser(null);
                resetForm();
              }
            }}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
                <h2 className="text-xl font-semibold text-white">Edit User</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-4">
              {/* Avatar Upload */}
              <AvatarUploader
                avatarUrl={formData.profile.avatar}
                onUpload={async (file) => {
                  const url = await uploadAvatarMutation.mutateAsync({ userId: editingUser._id, file });
                  setFormData({
                    ...formData,
                    profile: { ...formData.profile, avatar: url },
                  });
                  return url;
                }}
                maxSizeMb={5}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    disabled={editingUser._id === currentUser?._id}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none disabled:opacity-50"
                  >
                    <option value="customer">Customer</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Status</label>
                  <select
                    value={formData.isActive.toString()}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    disabled={editingUser._id === currentUser?._id}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none disabled:opacity-50"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  New Password (leave empty to keep current)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 pr-10 text-white focus:border-[#B39CD0] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Timezone</label>
                <input
                  type="text"
                  value={formData.profile.timezone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      profile: { ...formData.profile, timezone: e.target.value },
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Company Info</label>
                <textarea
                  value={formData.profile.companyInfo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      profile: { ...formData.profile, companyInfo: e.target.value },
                    })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="flex-1 rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update User'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20"
                >
                  Cancel
                </button>
              </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
