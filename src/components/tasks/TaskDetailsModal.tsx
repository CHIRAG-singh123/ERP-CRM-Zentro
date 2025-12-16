import { X, Edit, Trash2, Calendar, User, Tag } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useDeleteTask } from '../../hooks/queries/useTasks';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useState, useEffect } from 'react';
import type { Task } from '../../services/api/tasks';

interface TaskDetailsModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  hideEditButton?: boolean;
}

export function TaskDetailsModal({ task, isOpen, onClose, onEdit, onDelete, hideEditButton = false }: TaskDetailsModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const deleteMutation = useDeleteTask();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(task._id);
      setShowDeleteConfirm(false);
      onDelete();
      onClose();
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const modalContent = (
    <>
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
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
            <h2 className="text-xl font-semibold text-white">Task Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 p-6">
            <div className="space-y-6">
            {/* Title and Status/Priority */}
            <div>
              <h3 className="mb-2 text-lg font-semibold text-white">{task.title}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-white/70">Description</h4>
                <p className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 p-3 text-sm text-white/80">
                  {task.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Assigned To */}
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 text-white/50" />
                <div className="flex-1">
                  <p className="text-xs text-white/50 mb-1">Assigned To</p>
                  {task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? (
                    <div className="space-y-1">
                      {task.assignedTo.map((user: { _id: string; name: string; email: string }, index: number) => (
                        <p key={user._id || index} className="text-sm font-medium text-white">
                          {user.name} <span className="text-white/60">({user.email})</span>
                        </p>
                      ))}
                    </div>
                  ) : task.assignedTo && !Array.isArray(task.assignedTo) ? (
                    <p className="text-sm font-medium text-white">
                      {(task.assignedTo as { name: string; email: string }).name}{' '}
                      <span className="text-white/60">({(task.assignedTo as { name: string; email: string }).email})</span>
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-white/50">Unassigned</p>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-white/50" />
                <div>
                  <p className="text-xs text-white/50">Due Date</p>
                  <p className="text-sm font-medium text-white">{formatDate(task.dueDate)}</p>
                </div>
              </div>

              {/* Created By */}
              {task.createdBy && (
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-white/50" />
                  <div>
                    <p className="text-xs text-white/50">Created By</p>
                    <p className="text-sm font-medium text-white">
                      {task.createdBy.name} ({task.createdBy.email})
                    </p>
                  </div>
                </div>
              )}

              {/* Completed Date */}
              {task.completedDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-white/50" />
                  <div>
                    <p className="text-xs text-white/50">Completed Date</p>
                    <p className="text-sm font-medium text-white">{formatDate(task.completedDate)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-white/70">
                  <Tag className="h-4 w-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-white/10 bg-[#1A1A1C]/70 px-3 py-1 text-xs text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t border-white/10 pt-4">
              <div className="grid grid-cols-1 gap-2 text-xs text-white/50">
                <p>Created: {formatDateTime(task.createdAt)}</p>
                <p>Last Updated: {formatDateTime(task.updatedAt)}</p>
              </div>
            </div>

              {/* Actions - Only for Admin, hide edit button if hideEditButton is true */}
              {isAdmin && (
                <div className="flex gap-2 border-t border-white/10 pt-4">
                  {!hideEditButton && (
                    <button
                      onClick={onEdit}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Task
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-all duration-200 hover:border-red-500/50 hover:bg-red-500/20 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Task
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}

