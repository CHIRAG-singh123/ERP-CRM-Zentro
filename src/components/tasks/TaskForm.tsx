import { Formik, Form, Field, ErrorMessage } from 'formik';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import * as Yup from 'yup';
import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAllUsers } from '../../hooks/queries/useUsers';
import { useCreateTask, useUpdateTask, type CreateTaskData, type UpdateTaskData } from '../../hooks/queries/useTasks';
import { MultiSelectDropdown } from '../common/MultiSelectDropdown';
import type { Task } from '../../services/api/tasks';

interface TaskFormProps {
  task?: Task;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  initialDueDate?: string;
}

interface TaskFormValues {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  assignedTo: string[];
  dueDate: string;
  tags: string;
}

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required').min(3, 'Title must be at least 3 characters'),
  description: Yup.string(),
  status: Yup.string().oneOf(['Todo', 'In Progress', 'Done', 'Cancelled']).required('Status is required'),
  priority: Yup.string().oneOf(['Low', 'Medium', 'High', 'Urgent']).required('Priority is required'),
  assignedTo: Yup.array().of(Yup.string()),
  dueDate: Yup.string().required('Due Date is required'),
  tags: Yup.string(),
});

export function TaskForm({ task, isOpen, onSuccess, onCancel, initialDueDate }: TaskFormProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Only admins can create/edit tasks
  if (!isAdmin) {
    return null;
  }

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

  // Track if form is being actively edited to prevent socket updates from resetting form
  const isActivelyEditingRef = useRef(false);
  const lastUserInteractionRef = useRef<number>(0);

  // Fetch all active employees and admins for task assignment
  const { data: usersData, isLoading: isLoadingUsers } = useAllUsers({ page: 1, limit: 1000, isActive: true });
  const users = usersData?.users || [];
  
  // Filter to only show employees and admins, and ensure they have required fields
  // Convert all _id to strings for consistent comparison
  const availableUsers = useMemo(() => {
    return users
      .filter((u) => (u.role === 'employee' || u.role === 'admin') && u._id && u.name && u.email)
      .map((u) => ({
        _id: String(u._id), // Ensure _id is always a string
        name: u.name,
        email: u.email,
      }));
  }, [users]);

  // Normalize assignedTo field to handle different data structures
  const normalizeAssignedTo = (assignedTo: any): string[] => {
    if (!assignedTo) return [];
    
    // If it's already an array
    if (Array.isArray(assignedTo)) {
      return assignedTo
        .map((u) => {
          // If it's already a string (ID), use it directly
          if (typeof u === 'string') {
            return u;
          }
          // If it's an object with _id, extract and convert to string
          if (u && typeof u === 'object' && u._id) {
            // Ensure _id is converted to string (handles ObjectId objects)
            return String(u._id);
          }
          // Try toString() as fallback
          if (u && typeof u.toString === 'function') {
            return String(u);
          }
          return null;
        })
        .filter((id): id is string => Boolean(id) && typeof id === 'string');
    }
    
    // If it's a single object, extract _id
    if (typeof assignedTo === 'object' && assignedTo !== null) {
      if (assignedTo._id) {
        return [String(assignedTo._id)];
      }
      return [];
    }
    
    // If it's a single string (ID)
    if (typeof assignedTo === 'string') {
      return [assignedTo];
    }
    
    return [];
  };

  // Ensure assignedTo IDs exist in availableUsers (filter out invalid IDs)
  // This ensures only valid user IDs are used in the form
  // If users aren't loaded yet, return normalized IDs anyway - they'll be filtered when users load
  const validAssignedToIds = useMemo(() => {
    if (!task?.assignedTo) return [];
    
    const normalizedIds = normalizeAssignedTo(task.assignedTo).map(id => String(id));
    
    // If users aren't loaded yet, return normalized IDs anyway
    // This allows the form to initialize with the correct IDs, and they'll be validated when users load
    if (availableUsers.length === 0) {
      return normalizedIds;
    }
    
    // Filter to only include IDs that exist in availableUsers
    const availableUserIds = new Set(availableUsers.map(u => String(u._id)));
    return normalizedIds.filter(id => availableUserIds.has(id));
  }, [task?.assignedTo, availableUsers]);

  // Compute initial values using useMemo - only when task, validAssignedToIds, or initialDueDate changes
  const initialValues: TaskFormValues = useMemo(() => {
    return {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'Todo',
      priority: task?.priority || 'Medium',
      assignedTo: validAssignedToIds,
      dueDate: initialDueDate || (task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''),
      tags: task?.tags?.join(', ') || '',
    };
  }, [task, validAssignedToIds, initialDueDate]);

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

  // If editing a task, ensure we have task data before rendering form
  // This prevents form from initializing with empty values
  if (task && !task._id) {
    return null;
  }

  const handleSubmit = async (values: TaskFormValues) => {
    try {
      // Normalize assignedTo to ensure all IDs are strings
      const normalizedAssignedTo = values.assignedTo && values.assignedTo.length > 0
        ? values.assignedTo.map(id => String(id)).filter(Boolean)
        : undefined;

      const baseData = {
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        assignedTo: normalizedAssignedTo,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
        tags: values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
      };

      if (task) {
        const updateData: UpdateTaskData = {
          ...baseData,
          title: values.title,
        };
        await updateMutation.mutateAsync({ id: task._id, data: updateData });
      } else {
        const createData: CreateTaskData = {
          ...baseData,
          title: values.title,
        };
        await createMutation.mutateAsync(createData);
      }
      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">{task ? 'Edit Task' : 'Create New Task'}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {/* Wait for users to load before showing form - critical for MultiSelectDropdown to work */}
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
                <div className="text-white/60 animate-pulse">Loading user data...</div>
              </div>
            </div>
          ) : (
            <Formik
              key={`${task?._id || 'new-task'}-${availableUsers.map(u => u._id).sort().join(',')}-${isLoadingUsers}`}
              initialValues={initialValues}
              enableReinitialize={true}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
            {({ isSubmitting, values, setFieldValue, errors }) => {
              // Track user interactions to detect active editing
              useEffect(() => {
                const handleUserInteraction = () => {
                  isActivelyEditingRef.current = true;
                  lastUserInteractionRef.current = Date.now();
                  // Reset flag after 2 seconds of no interaction
                  setTimeout(() => {
                    if (Date.now() - lastUserInteractionRef.current >= 2000) {
                      isActivelyEditingRef.current = false;
                    }
                  }, 2000);
                };

                // Listen for user interactions
                const events = ['input', 'change', 'click', 'keydown'];
                events.forEach(event => {
                  document.addEventListener(event, handleUserInteraction, true);
                });

                return () => {
                  events.forEach(event => {
                    document.removeEventListener(event, handleUserInteraction, true);
                  });
                };
              }, []);

              // Manual synchronization of assignedTo field when validAssignedToIds changes
              // This ensures the form updates even if Formik's re-initialization doesn't trigger
              // This is critical for calendar edit form where task data and users load at different times
              // BUT: Don't sync if user is actively editing to prevent socket updates from resetting form
              useEffect(() => {
                // Don't sync if user is actively editing (within last 2 seconds)
                if (isActivelyEditingRef.current && Date.now() - lastUserInteractionRef.current < 2000) {
                  return;
                }

                // Wait for users to be loaded before syncing (for edit mode)
                if (task && availableUsers.length > 0) {
                  // Get current value as sorted string array for comparison
                  const currentValue = (values.assignedTo || []).map(id => String(id)).sort();
                  const newValue = validAssignedToIds.map(id => String(id)).sort();
                  
                  // Only update if values are different (prevents infinite loops)
                  const currentValueStr = currentValue.join(',');
                  const newValueStr = newValue.join(',');
                  
                  if (currentValueStr !== newValueStr) {
                    // Use setFieldValue with validate: false to avoid validation errors during sync
                    setFieldValue('assignedTo', validAssignedToIds, false);
                  }
                } else if (!task) {
                  // For new tasks, ensure assignedTo is empty array if not set
                  if (values.assignedTo && values.assignedTo.length > 0) {
                    setFieldValue('assignedTo', [], false);
                  }
                }
              }, [validAssignedToIds, availableUsers.length, setFieldValue, task, values.assignedTo]);
              
              return (
            <Form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <Field
                  name="title"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                  placeholder="Enter task title"
                />
                <ErrorMessage name="title" component="p" className="mt-1 text-xs text-red-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Description</label>
                <Field
                  as="textarea"
                  name="description"
                  rows={4}
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 resize-none"
                  placeholder="Enter task description"
                />
                <ErrorMessage name="description" component="p" className="mt-1 text-xs text-red-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Status <span className="text-red-400">*</span>
                  </label>
                  <Field
                    as="select"
                    name="status"
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                  >
                    <option value="Todo" className="bg-[#1A1A1C] text-white">
                      Todo
                    </option>
                    <option value="In Progress" className="bg-[#1A1A1C] text-white">
                      In Progress
                    </option>
                    <option value="Done" className="bg-[#1A1A1C] text-white">
                      Done
                    </option>
                    <option value="Cancelled" className="bg-[#1A1A1C] text-white">
                      Cancelled
                    </option>
                  </Field>
                  <ErrorMessage name="status" component="p" className="mt-1 text-xs text-red-400" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Priority <span className="text-red-400">*</span>
                  </label>
                  <Field
                    as="select"
                    name="priority"
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                  >
                    <option value="Low" className="bg-[#1A1A1C] text-white">
                      Low
                    </option>
                    <option value="Medium" className="bg-[#1A1A1C] text-white">
                      Medium
                    </option>
                    <option value="High" className="bg-[#1A1A1C] text-white">
                      High
                    </option>
                    <option value="Urgent" className="bg-[#1A1A1C] text-white">
                      Urgent
                    </option>
                  </Field>
                  <ErrorMessage name="priority" component="p" className="mt-1 text-xs text-red-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <MultiSelectDropdown
                    label="Assign To (Multiple)"
                    placeholder={
                      isLoadingUsers
                        ? 'Loading users...'
                        : availableUsers.length === 0
                          ? 'No employees/admins available'
                          : 'Select employees to assign this task'
                    }
                    options={availableUsers}
                    value={(values.assignedTo || []).map(id => String(id))}
                    onChange={(selectedIds) => {
                      // Mark as actively editing when user changes selection
                      isActivelyEditingRef.current = true;
                      lastUserInteractionRef.current = Date.now();
                      setFieldValue('assignedTo', selectedIds);
                    }}
                    error={errors.assignedTo as string | undefined}
                    disabled={isLoadingUsers || availableUsers.length === 0}
                  />
                  {isLoadingUsers && (
                    <p className="mt-1 text-xs text-white/50">Loading users...</p>
                  )}
                  {!isLoadingUsers && availableUsers.length === 0 && (
                    <p className="mt-1 text-xs text-yellow-400">No employees or admins found. Please ensure users exist with these roles.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Due Date <span className="text-red-400">*</span>
                  </label>
                  <Field
                    type="date"
                    name="dueDate"
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                  />
                  <ErrorMessage name="dueDate" component="p" className="mt-1 text-xs text-red-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Tags</label>
                <Field
                  name="tags"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                  placeholder="Enter tags separated by commas"
                />
                <p className="mt-1 text-xs text-white/50">Separate multiple tags with commas</p>
                <ErrorMessage name="tags" component="p" className="mt-1 text-xs text-red-400" />
              </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className="crud-button crud-button-primary flex-1"
                    >
                      {(isSubmitting || isLoading) && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                      {task ? 'Update Task' : 'Create Task'}
                    </button>
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={isSubmitting || isLoading}
                      className="crud-button crud-button-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
            </Form>
              );
            }}
        </Formik>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

