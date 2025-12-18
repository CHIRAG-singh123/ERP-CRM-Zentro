import { X, Eye, Trash2, Calendar, User } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useDeleteTask, useTasks } from '../../hooks/queries/useTasks';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useState, useEffect } from 'react';
import type { Task } from '../../services/api/tasks';
import { TaskDetailsModal } from './TaskDetailsModal';

interface DayTasksModalProps {
  selectedDate: Date | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskDeleted?: () => void;
}

export function DayTasksModal({ selectedDate, isOpen, onClose, onTaskDeleted }: DayTasksModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const deleteMutation = useDeleteTask();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Calculate date range for the selected day
  const dateRange = selectedDate
    ? {
        startDate: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).toISOString(),
        endDate: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999).toISOString(),
      }
    : null;

  // Fetch tasks for the selected date
  const { data: tasksData, isLoading } = useTasks(
    dateRange
      ? {
          page: 1,
          limit: 100,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : undefined
  );

  // Filter tasks to only include those on the exact selected date
  const tasks = tasksData?.tasks?.filter((task) => {
    if (!task.dueDate || !selectedDate) return false;
    const taskDate = new Date(task.dueDate);
    const selected = new Date(selectedDate);
    return (
      taskDate.getFullYear() === selected.getFullYear() &&
      taskDate.getMonth() === selected.getMonth() &&
      taskDate.getDate() === selected.getDate()
    );
  }) || [];

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

  if (!isOpen || !selectedDate) return null;

  const handleDelete = async (task: Task) => {
    try {
      await deleteMutation.mutateAsync(task._id);
      setShowDeleteConfirm(null);
      onTaskDeleted?.();
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
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
          className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
            <div>
              <h2 className="text-xl font-semibold text-white">Tasks for {formatDate(selectedDate)}</h2>
              <p className="text-sm text-white/60 mt-1">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</p>
            </div>
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
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#A8DADC]"></div>
                  <div className="text-white/60 animate-pulse">Loading tasks...</div>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Calendar className="h-16 w-16 text-white/20 mb-4" />
                <p className="text-white/60 text-lg">No tasks for this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task._id}
                    className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 p-4 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-white mb-1">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-white/70 line-clamp-2 mb-2">{task.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <TaskStatusBadge status={task.status} />
                              <TaskPriorityBadge priority={task.priority} />
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
                              {task.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatTime(task.dueDate)}</span>
                                </div>
                              )}
                              {task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>
                                    {task.assignedTo.length === 1
                                      ? task.assignedTo[0].name
                                      : `${task.assignedTo.length} assignees`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setViewingTask(task)}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setShowDeleteConfirm(task)}
                            disabled={deleteMutation.isPending}
                            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition-all duration-200 hover:border-red-500/50 hover:bg-red-500/20 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete "${showDeleteConfirm.title}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      )}

      {/* Task Details Modal */}
      {viewingTask && (
        <TaskDetailsModal
          task={viewingTask}
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          onEdit={() => {
            // Edit not available in this modal
            setViewingTask(null);
          }}
          onDelete={() => {
            onTaskDeleted?.();
            setViewingTask(null);
          }}
          hideEditButton={true}
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}

