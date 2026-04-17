import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Eye, Edit, Trash2, Filter, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOverdueTasks, useTasks, useAllTasks, useDeleteTask, useTaskSocketUpdates } from '../../hooks/queries/useTasks';
import { DataGrid } from '../common/DataGrid';
import { TaskForm } from './TaskForm';
import { TaskDetailsModal } from './TaskDetailsModal';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Task } from '../../services/api/tasks';

type FilterType = 'overdue' | 'week' | 'month' | 'all' | 'my';

interface OverdueTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AssigneeLike = { _id?: string; name?: string; email?: string };

const ASSIGNEES_COLLAPSED_COUNT = 2;

// Renders up to N assignees by default with a "+M more" toggle. When expanded,
// all names scroll inside a fixed-height viewport so the table row height does
// not grow regardless of how many members are assigned.
function AssigneesCell({ assignees }: { assignees: AssigneeLike[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!assignees || assignees.length === 0) {
    return <span className="text-white/50">Unassigned</span>;
  }

  const hasMany = assignees.length > ASSIGNEES_COLLAPSED_COUNT;
  const visible = expanded || !hasMany
    ? assignees
    : assignees.slice(0, ASSIGNEES_COLLAPSED_COUNT);

  return (
    <div className="min-w-0">
      <div
        className={
          hasMany
            ? 'h-[54px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]'
            : ''
        }
      >
        <div className="space-y-0.5">
          {visible.map((u, idx) => (
            <p
              key={u?._id || idx}
              className="text-sm leading-tight text-white/80"
              title={u?.email || u?.name}
            >
              {u?.name || u?.email || 'Unknown'}
            </p>
          ))}
        </div>
      </div>
      {hasMany && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-1 rounded text-[11px] font-medium text-[#A8DADC] transition-colors hover:text-[#BCE7E5] focus:outline-none focus:ring-1 focus:ring-[#A8DADC]/40"
          aria-expanded={expanded}
        >
          {expanded
            ? 'Show less'
            : `+${assignees.length - ASSIGNEES_COLLAPSED_COUNT} more`}
        </button>
      )}
    </div>
  );
}

// Helper functions for date ranges
// "This week" means upcoming tasks: from today 00:00 (local) through end of the
// current Mon-Sun week (Sunday 23:59:59.999 local). Past days are excluded so
// overdue tasks never leak into the weekly view.
function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setHours(0, 0, 0, 0);

  const dayOfWeek = now.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const end = new Date(start);
  end.setDate(start.getDate() + daysUntilSunday);
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
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Fetch overdue tasks (used only for the explicit "overdue" filter)
  const overdueQuery = useOverdueTasks({ page: 1, limit: 50 });
  
  // Fetch tasks based on filter type
  const dateRange = getDateRange();
  const tasksQuery = useTasks({
    page: 1,
    limit: 50,
    ...(filterType === 'overdue' ? {} : dateRange),
  });

  // All pages (removes the 50-item ceiling for "All Tasks" / "My Task")
  const allTasksQuery = useAllTasks(
    filterType === 'all' || filterType === 'my'
      ? {
          limit: 100,
        }
      : undefined
  );

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
  } else if (filterType === 'all') {
    isLoading = allTasksQuery.isLoading;
    refetch = allTasksQuery.refetch;
    tasks = allTasksQuery.data?.tasks || [];
  } else if (filterType === 'my') {
    isLoading = allTasksQuery.isLoading;
    refetch = allTasksQuery.refetch;
    const allTasks = allTasksQuery.data?.tasks || [];
    const myUserId = user?._id?.toString();
    tasks = myUserId
      ? allTasks.filter((task) => {
          const assignedToMe = Array.isArray(task.assignedTo)
            ? task.assignedTo.some((u) => u?._id?.toString() === myUserId)
            : false;
          const createdByMe = task.createdBy?._id?.toString() === myUserId;
          return assignedToMe || createdByMe;
        })
      : [];
  } else if (filterType === 'week') {
    // "This Week" shows upcoming tasks only (today 00:00 -> end of week).
    // It must NOT include overdue tasks; source strictly from the date-bounded query.
    isLoading = tasksQuery.isLoading;
    refetch = tasksQuery.refetch;

    const weekTasks = tasksQuery.data?.tasks || [];
    // Safety net: drop any task that slips through without a dueDate or whose
    // dueDate is before the start of today (handles timezone/backend edge cases).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    tasks = weekTasks.filter((task) => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate).getTime() >= startOfToday.getTime();
    });

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

  const filteredTasks = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return tasks;

    const query = trimmed.toLowerCase();
    return tasks.filter((task) => {
      const titleMatch = task.title?.toLowerCase().includes(query);
      const descMatch = task.description?.toLowerCase().includes(query);

      const assigneeMatch = Array.isArray(task.assignedTo)
        ? task.assignedTo.some((u) => u?.name?.toLowerCase().includes(query))
        : false;

      const createdByMatch = task.createdBy?.name?.toLowerCase().includes(query) || false;

      return Boolean(titleMatch || descMatch || assigneeMatch || createdByMatch);
    });
  }, [tasks, searchQuery]);

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
      refetch();
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleFormSuccess = () => {
    setShowCreateModal(false);
    setEditingTask(null);
    refetch();
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
      case 'my':
        return 'My Task';
      default:
        return 'Overdue';
    }
  };

  const getTaskCountLabel = (): string => {
    const count = filteredTasks.length;
    const totalCount = tasks.length;
    if (filterType === 'overdue') {
      return `${count} ${count === 1 ? 'task' : 'tasks'} requiring attention`;
    } else if (filterType === 'week') {
      return `${count} ${count === 1 ? 'task' : 'tasks'} remaining this week`;
    } else if (filterType === 'month') {
      return `${count} ${count === 1 ? 'task' : 'tasks'} this month`;
    } else {
      if (searchQuery.trim() && count !== totalCount) {
        return `${count} of ${totalCount} ${totalCount === 1 ? 'task' : 'tasks'}`;
      }
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
          <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-white">Tasks</h2>
              <p className="mt-1 text-sm text-white/60">{getTaskCountLabel()}</p>
            </div>
            <div className="flex flex-1 max-w-md items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/60 transition-all duration-200 focus-within:border-[#A8DADC] focus-within:ring-2 focus-within:ring-[#A8DADC]/20">
              <Search className="h-4 w-4 text-white/40" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none"
                placeholder="Search tasks by title, description, assignee, or creator..."
              />
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
                  <option value="my">My Task</option>
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
            ) : filteredTasks.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
                <p className="text-lg font-medium text-white/70 mb-2">
                  {searchQuery.trim()
                    ? 'No tasks match your search'
                    : `No ${getFilterLabel(filterType).toLowerCase()} tasks`}
                </p>
                <p className="text-white/50">
                  {searchQuery.trim()
                    ? 'Try adjusting your search terms.'
                    : filterType === 'overdue' 
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
                    const assignees: AssigneeLike[] = Array.isArray(task.assignedTo)
                      ? (task.assignedTo as AssigneeLike[])
                      : task.assignedTo
                        ? [task.assignedTo as AssigneeLike]
                        : [];
                    return <AssigneesCell assignees={assignees} />;
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
              data={filteredTasks}
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
            refetch();
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

