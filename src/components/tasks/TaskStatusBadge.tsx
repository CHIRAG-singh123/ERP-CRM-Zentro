import type { Task } from '../../services/api/tasks';

interface TaskStatusBadgeProps {
  status: Task['status'];
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const statusConfig = {
    Todo: {
      label: 'Todo',
      className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    },
    'In Progress': {
      label: 'In Progress',
      className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    Done: {
      label: 'Done',
      className: 'bg-green-500/20 text-green-300 border-green-500/30',
    },
    Cancelled: {
      label: 'Cancelled',
      className: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
  };

  const config = statusConfig[status] || statusConfig.Todo;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 ${config.className}`}
    >
      {config.label}
    </span>
  );
}

