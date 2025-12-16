import type { Task } from '../../services/api/tasks';

interface TaskPriorityBadgeProps {
  priority: Task['priority'];
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const priorityConfig = {
    Low: {
      label: 'Low',
      className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    },
    Medium: {
      label: 'Medium',
      className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    },
    High: {
      label: 'High',
      className: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    },
    Urgent: {
      label: 'Urgent',
      className: 'bg-red-500/20 text-red-300 border-red-500/30',
    },
  };

  const config = priorityConfig[priority] || priorityConfig.Medium;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 ${config.className}`}
    >
      {config.label}
    </span>
  );
}

