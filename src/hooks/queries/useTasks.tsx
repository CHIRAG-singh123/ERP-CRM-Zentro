import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getOverdueTasks,
  getTaskEvents,
  type Task,
  type CreateTaskPayload,
  type UpdateTaskPayload,
} from '../../services/api/tasks';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export type CreateTaskData = CreateTaskPayload;
export type UpdateTaskData = UpdateTaskPayload;

export function useTasks(params?: {
  page?: number;
  limit?: number;
  status?: Task['status'];
  assignedTo?: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => getTasks(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOverdueTasks(params?: {
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['tasks', 'overdue', params],
    queryFn: () => getOverdueTasks(params),
    staleTime: 1 * 60 * 1000,
  });
}

export function useTaskEvents(start?: string, end?: string) {
  return useQuery({
    queryKey: ['taskEvents', start, end],
    queryFn: () => getTaskEvents(start, end),
    staleTime: 30 * 1000,
    // Keep previous data while fetching new data to prevent loading states during navigation
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false, // Prevent refetch on window focus to avoid interrupting navigation
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (data: CreateTaskData) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskEvents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Task created successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) => updateTask(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['taskEvents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Task updated successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to update task');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskEvents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Task deleted successfully');
    },
    onError: (err: Error) => {
      error(err.message || 'Failed to delete task');
    },
  });
}

/**
 * Hook to handle real-time task updates via Socket.IO
 * Updates React Query cache optimistically when tasks are created/updated/deleted
 */
export function useTaskSocketUpdates() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { onTaskCreated, onTaskUpdated, onTaskDeleted, subscribeToTasks } = useSocket();

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'employee')) {
      return;
    }

    // Subscribe to task room
    subscribeToTasks();

    // Handle task created
    const unsubscribeCreated = onTaskCreated((task: Task) => {
      // Check if task is assigned to current user
      const assignedToIds = Array.isArray(task.assignedTo)
        ? task.assignedTo.map((u: any) => (u?._id ? u._id.toString() : u.toString()))
        : task.assignedTo
          ? [(task.assignedTo as any)?._id ? (task.assignedTo as any)._id.toString() : (task.assignedTo as any).toString()]
          : [];

      if (user.role === 'admin' || assignedToIds.includes(user._id)) {
        // Update all task queries
        queryClient.setQueriesData(
          { queryKey: ['tasks'] },
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              tasks: [task, ...(oldData.tasks || [])],
              pagination: {
                ...oldData.pagination,
                total: (oldData.pagination?.total || 0) + 1,
              },
            };
          }
        );

        // Invalidate to refetch with correct filters
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', 'overdue'] });
        queryClient.invalidateQueries({ queryKey: ['taskEvents'] });
      }
    });

    // Handle task updated
    const unsubscribeUpdated = onTaskUpdated((task: Task) => {
      // Check if task is assigned to current user
      const assignedToIds = Array.isArray(task.assignedTo)
        ? task.assignedTo.map((u: any) => (u?._id ? u._id.toString() : u.toString()))
        : task.assignedTo
          ? [(task.assignedTo as any)?._id ? (task.assignedTo as any)._id.toString() : (task.assignedTo as any).toString()]
          : [];

      if (user.role === 'admin' || assignedToIds.includes(user._id)) {
        // Update task in all queries
        queryClient.setQueriesData(
          { queryKey: ['tasks'] },
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              tasks: (oldData.tasks || []).map((t: Task) =>
                t._id === task._id ? task : t
              ),
            };
          }
        );

        // Update single task query
        queryClient.setQueryData(['task', task._id], { task });

        // Invalidate to ensure consistency
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', 'overdue'] });
        queryClient.invalidateQueries({ queryKey: ['taskEvents'] });
      } else {
        // Task was unassigned from user, remove it
        queryClient.setQueriesData(
          { queryKey: ['tasks'] },
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              tasks: (oldData.tasks || []).filter((t: Task) => t._id !== task._id),
              pagination: {
                ...oldData.pagination,
                total: Math.max(0, (oldData.pagination?.total || 0) - 1),
              },
            };
          }
        );
      }
    });

    // Handle task deleted
    const unsubscribeDeleted = onTaskDeleted((data: { taskId: string; deletedBy: string }) => {
      // Remove task from all queries
      queryClient.setQueriesData(
        { queryKey: ['tasks'] },
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            tasks: (oldData.tasks || []).filter((t: Task) => t._id !== data.taskId),
            pagination: {
              ...oldData.pagination,
              total: Math.max(0, (oldData.pagination?.total || 0) - 1),
            },
          };
        }
      );

      // Remove single task query
      queryClient.removeQueries({ queryKey: ['task', data.taskId] });

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'overdue'] });
      queryClient.invalidateQueries({ queryKey: ['taskEvents'] });
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [user, queryClient, onTaskCreated, onTaskUpdated, onTaskDeleted, subscribeToTasks]);
}

