import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Search, Edit, Trash2, TrendingUp, Crown, X } from 'lucide-react';
import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { FileUploader } from '../../components/common/FileUploader';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useUploadEmployeesCSV,
  usePromoteToAdmin,
} from '../../hooks/queries/useEmployees';
import { logger } from '../../utils/logger';
import type { EmployeeFormData } from '../../types/employees';

export function EmployeesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({ name: '', email: '' });

  const { data, isLoading, isError, error } = useEmployees({
    page: 1,
    limit: 50,
    search,
    isActive,
  });

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const uploadMutation = useUploadEmployeesCSV();
  const promoteMutation = usePromoteToAdmin();

  const employees = data?.employees ?? [];

  // Body scroll lock when modals are open
  useEffect(() => {
    if (showCreateModal || showCSVModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateModal, showCSVModal]);

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData);
      setShowCreateModal(false);
      setFormData({ name: '', email: '' });
    } catch (error) {
      logger.error('Error creating employee:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingEmployee) return;
    try {
      await updateMutation.mutateAsync({ id: editingEmployee, data: formData });
      setEditingEmployee(null);
      setFormData({ name: '', email: '' });
    } catch (error) {
      logger.error('Error updating employee:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        logger.error('Error deleting employee:', error);
      }
    }
  };

  const handlePromote = async (id: string) => {
    if (confirm('Are you sure you want to promote this employee to admin?')) {
      try {
        await promoteMutation.mutateAsync(id);
      } catch (error) {
        logger.error('Error promoting employee:', error);
      }
    }
  };

  const handleCSVUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync(file);
      setShowCSVModal(false);
      alert(`Successfully uploaded CSV. ${uploadMutation.data?.created || 0} employees created.`);
    } catch (error) {
      logger.error('Error uploading CSV:', error);
      alert('Error uploading CSV. Please check the file format.');
    }
  };

  const openEditModal = (employee: { _id: string; name: string; email: string }) => {
    setEditingEmployee(employee._id);
    setFormData({ name: employee.name, email: employee.email });
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employees"
        description="Manage employee accounts, track performance, and assign roles."
        actions={
          <>
            <button
              onClick={() => setShowCSVModal(true)}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </button>
            <button
              onClick={() => {
                setEditingEmployee(null);
                setFormData({ name: '', email: '' });
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9]"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#B39CD0] focus:outline-none"
          />
        </div>
        <select
          value={isActive === undefined ? 'all' : isActive ? 'active' : 'inactive'}
          onChange={(e) => {
            if (e.target.value === 'all') setIsActive(undefined);
            else setIsActive(e.target.value === 'active');
          }}
          className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-sm text-white focus:border-[#B39CD0] focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Data Grid */}
      {isLoading && employees.length === 0 ? (
        <DataGridPlaceholder columns={['Name', 'Email', 'Status', 'Created', 'Actions']} rows={5} />
      ) : employees.length > 0 ? (
        <DataGrid
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (row) => {
                const emp = row as any;
                return (
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={emp.profile?.avatar}
                      name={emp.name}
                      email={emp.email}
                      size={40}
                    />
                    <span className="font-medium text-white">{emp.name}</span>
                  </div>
                );
              },
            },
            { key: 'email', header: 'Email' },
            {
              key: 'isActive',
              header: 'Status',
              render: (row) => {
                const emp = row as any;
                return (
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      emp.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {emp.isActive ? 'Active' : 'Inactive'}
                  </span>
                );
              },
            },
            {
              key: 'createdAt',
              header: 'Created',
              render: (row) => {
                const emp = row as any;
                return emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A';
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => {
                const emp = row as any;
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/admin/employees/${emp._id}/performance`)}
                      className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-[#B39CD0]"
                      title="View Performance"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(emp)}
                      className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-blue-400"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePromote(emp._id)}
                      className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-yellow-400"
                      title="Promote to Admin"
                    >
                      <Crown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(emp._id)}
                      className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              },
            },
          ]}
          data={employees}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {isError ? (error as Error).message : 'No employees found.'}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateModal(false);
                setEditingEmployee(null);
                setFormData({ name: '', email: '' });
              }
            }}
          >
            <div
              className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
                <h2 className="text-xl font-semibold text-white">
                  {editingEmployee ? 'Edit Employee' : 'Create Employee'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEmployee(null);
                    setFormData({ name: '', email: '' });
                  }}
                  className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={editingEmployee ? handleUpdate : handleCreate}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50"
                >
                  {editingEmployee ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEmployee(null);
                    setFormData({ name: '', email: '' });
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

      {/* CSV Upload Modal */}
      {showCSVModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCSVModal(false);
              }
            }}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
                <h2 className="text-xl font-semibold text-white">Upload Employees CSV</h2>
                <button
                  onClick={() => setShowCSVModal(false)}
                  className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-4">
              <FileUploader
                accept=".csv"
                onFileSelect={handleCSVUpload}
                label="CSV File (name,email)"
              />
              <p className="text-xs text-white/50">
                CSV format: name,email (one per line). Default password will be set to "Employee@123"
              </p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

