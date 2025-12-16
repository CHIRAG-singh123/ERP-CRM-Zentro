import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Eye, Edit, Trash2, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOverdueTasks, useTasks, useDeleteTask, useTaskSocketUpdates } from '../../hooks/queries/useTasks';
import { DataGrid } from '../common/DataGrid';
import { TaskForm } from './TaskForm';
import { TaskDetailsModal } from './TaskDetailsModal';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Task } from '../../services/api/tasks';

type FilterType = 'overdue' | 'week' | 'month' | 'all';

interface OverdueTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions for date ranges
function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
  const start = new Date(now.getFullYear(), now.getMonth(), diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getThisMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function OverdueTasksModal({ isOpen, onClose }: OverdueTasksModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Customers cannot view tasks
  if (user?.role === 'customer') {
    return null;
  }

  const [filterType, setFilterType] = useState<FilterType>('week');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Body scroll lock and reset to weekly view when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset to weekly view when modal opens
      setFilterType('week');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Calculate date range based on filter
  const getDateRange = () => {
    if (filterType === 'week') {
      const { start, end } = getThisWeekRange();
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    } else if (filterType === 'month') {
      const { start, end } = getThisMonthRange();
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }
    return {};
  };

  // Fetch overdue tasks (needed for "overdue" filter and "week" filter)
  const overdueQuery = useOverdueTasks({ page: 1, limit: 50 });
  
  // Fetch tasks based on filter type
  const dateRange = getDateRange();
  const tasksQuery = useTasks({
    page: 1,
    limit: 50,
    // Only pass date params if not "all" or "overdue"
    ...(filterType === 'all' || filterType === 'overdue' ? {} : dateRange),
  });

  // Enable real-time task updates
  useTaskSocketUpdates();

  // Determine which query to use and merge data if needed
  let tasks: Task[] = [];
  let isLoading = false;
  let refetch = () => {};

  if (filterType === 'overdue') {
    isLoading = overdueQuery.isLoading;
    refetch = overdueQuery.refetch;
    tasks = overdueQuery.data?.tasks || [];
  } else if (filterType === 'week') {
    // For "This Week": merge week tasks + overdue tasks (deduplicate)
    isLoading = tasksQuery.isLoading || overdueQuery.isLoading;
    refetch = () => {
      tasksQuery.refetch();
      overdueQuery.refetch();
    };
    
    const weekTasks = tasksQuery.data?.tasks || [];
    const overdueTasks = overdueQuery.data?.tasks || [];
    
    // Merge and deduplicate by task ID
    const taskMap = new Map<string, Task>();
    weekTasks.forEach((task) => {
      taskMap.set(task._id, task);
    });
    overdueTasks.forEach((task) => {
      taskMap.set(task._id, task);
    });
    
    tasks = Array.from(taskMap.values());
    // Sort by dueDate (null/undefined last), then by createdAt
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  } else {
    // For "month" or "all"
    isLoading = tasksQuery.isLoading;
    refetch = tasksQuery.refetch;
    tasks = tasksQuery.data?.tasks || [];
    // Sort by dueDate (null/undefined last), then by createdAt
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  const deleteMutation = useDeleteTask();

  const handleView = (task: Task) => {
    setViewingTask(task);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowCreateModal(true);
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    try {
      await deleteMutation.mutateAsync(deletingTask._id);
      setDeletingTask(null);
      // Refetch both queries to ensure data is up to date
      if (filterType === 'week') {
        tasksQuery.refetch();
        overdueQuery.refetch();
      } else {
        refetch();
      }
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleFormSuccess = () => {
    setShowCreateModal(false);
    setEditingTask(null);
    // Refetch both queries to ensure data is up to date
    if (filterType === 'week') {
      tasksQuery.refetch();
      overdueQuery.refetch();
    } else {
      refetch();
    }
  };

  const handleFormCancel = () => {
    setShowCreateModal(false);
    setEditingTask(null);
  };

  if (!isOpen) return null;

  const getFilterLabel = (type: FilterType): string => {
    switch (type) {
      case 'overdue':
        return 'Overdue';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'all':
        return 'All Tasks';
      default:
        return 'Overdue';
    }
  };

  const getTaskCountLabel = (): string => {
    const count = tasks.length;
    if (filterType === 'overdue') {
      return `${count} ${count === 1 ? 'task' : 'tasks'} requiring attention`;
    } else if (filterType === 'week') {
      return `${count} ${count === 1 ? 'task' : 'tasks'} this week (includes overdue)`;
    } else if (filterType === 'month') {
      return `${count} ${count === 1 ? 'task' : 'tasks'} this month`;
    } else {
      return `${count} ${count === 1 ? 'task' : 'tasks'} total`;
    }
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
          className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-white">Tasks</h2>
              <p className="mt-1 text-sm text-white/60">{getTaskCountLabel()}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="appearance-none bg-[#2A2A2C] border border-white/10 rounded-lg px-4 py-2 pr-8 text-white text-sm font-medium cursor-pointer hover:bg-[#3A3A3C] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#A8DADC]"
                >
                  <option value="overdue">Overdue</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="all">All Tasks</option>
                </select>
                <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:bg-[#BCE7E5] hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 p-6">

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#A8DADC]"></div>
                  <div className="text-white/60 animate-pulse">Loading {getFilterLabel(filterType).toLowerCase()} tasks...</div>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
                <p className="text-lg font-medium text-white/70 mb-2">No {getFilterLabel(filterType).toLowerCase()} tasks</p>
                <p className="text-white/50">
                  {filterType === 'overdue' 
                    ? 'All tasks are up to date!' 
                    : `No tasks found for ${getFilterLabel(filterType).toLowerCase()}.`}
                </p>
              </div>
            ) : (
            <DataGrid
              columns={[
                {
                  key: 'title',
                  header: 'Title',
                  render: (row) => {
                    const task = row as Task;
                    return (
                      <div>
                        <p className="font-medium text-white">{task.title}</p>
                        {task.description && (
                          <p className="mt-1 truncate text-xs text-white/50">{task.description}</p>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  render: (row) => {
                    const task = row as Task;
                    return <TaskPriorityBadge priority={task.priority} />;
                  },
                },
                {
                  key: 'assignedTo',
                  header: 'Assigned To',
                  render: (row) => {
                    const task = row as Task;
                    if (task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
                      return (
                        <div className="space-y-1">
                          {task.assignedTo.map((user: { _id: string; name: string; email: string }, index: number) => (
                            <p key={user._id || index} className="text-sm text-white/80">
                              {user.name}
                            </p>
                          ))}
                        </div>
                      );
                    } else if (task.assignedTo && !Array.isArray(task.assignedTo)) {
                      return (
                        <span className="text-white/80">
                          {(task.assignedTo as { name: string; email: string }).name}
                        </span>
                      );
                    }
                    return <span className="text-white/50">Unassigned</span>;
                  },
                },
                {
                  key: 'dueDate',
                  header: 'Due Date',
                  render: (row) => {
                    const task = row as Task;
                    if (!task.dueDate) return <span className="text-white/50">Not set</span>;
                    const dueDate = new Date(task.dueDate);
                    const isOverdue = dueDate < new Date();
                    return (
                      <span className={isOverdue ? 'text-red-400 font-medium' : 'text-white/80'}>
                        {dueDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    );
                  },
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => {
                    const task = row as Task;
                    return <TaskStatusBadge status={task.status} />;
                  },
                },
              ]}
              data={tasks}
              actions={(row) => {
                const task = row as Task;
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(task)}
                      className="rounded-lg p-1.5 text-white/50 transition-all duration-200 hover:bg-white/10 hover:text-[#A8DADC] hover:scale-110"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleEdit(task)}
                          className="rounded-lg p-1.5 text-white/50 transition-all duration-200 hover:bg-white/10 hover:text-blue-400 hover:scale-110"
                          title="Edit Task"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTask(task)}
                          className="rounded-lg p-1.5 text-white/50 transition-all duration-200 hover:bg-white/10 hover:text-red-400 hover:scale-110"
                          title="Delete Task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              }}
            />
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {showCreateModal && (
        <TaskForm
          task={editingTask || undefined}
          isOpen={showCreateModal}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      {/* View Task Details Modal */}
      {viewingTask && (
        <TaskDetailsModal
          task={viewingTask}
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          onEdit={() => {
            setEditingTask(viewingTask);
            setViewingTask(null);
            setShowCreateModal(true);
          }}
          onDelete={() => {
            setViewingTask(null);
            // Refetch both queries to ensure data is up to date
            if (filterType === 'week') {
              tasksQuery.refetch();
              overdueQuery.refetch();
            } else {
              refetch();
            }
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingTask && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete "${deletingTask.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTask(null)}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}

