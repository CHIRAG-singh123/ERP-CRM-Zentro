import { fetchJson } from './http';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Done' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  }[];
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  dueDate?: string;
  completedDate?: string;
  relatedTo?: {
    type: string;
    id: string;
  };
  tags?: string[];
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  extendedProps: {
    description?: string;
    status: Task['status'];
    priority: Task['priority'];
    assignedTo?: Task['assignedTo'];
  };
  backgroundColor: string;
}

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface EventsResponse {
  events: CalendarEvent[];
}

export const getTasks = async (params?: {
  page?: number;
  limit?: number;
  status?: Task['status'];
  assignedTo?: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TasksResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo);
  if (params?.dueDate) queryParams.append('dueDate', params.dueDate);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);

  const queryString = queryParams.toString();
  return fetchJson<TasksResponse>(`/tasks${queryString ? `?${queryString}` : ''}`);
};

export const getTaskEvents = async (start?: string, end?: string): Promise<EventsResponse> => {
  const queryParams = new URLSearchParams();
  if (start) queryParams.append('start', start);
  if (end) queryParams.append('end', end);

  const queryString = queryParams.toString();
  return fetchJson<EventsResponse>(`/tasks/events${queryString ? `?${queryString}` : ''}`);
};

export const getTask = async (id: string): Promise<{ task: Task }> => {
  return fetchJson<{ task: Task }>(`/tasks/${id}`);
};

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignedTo?: string[];
  dueDate?: string;
  tags?: string[];
  relatedTo?: {
    type: string;
    id: string;
  };
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {}

export const createTask = async (data: CreateTaskPayload): Promise<{ task: Task }> => {
  return fetchJson<{ task: Task }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateTask = async (id: string, data: UpdateTaskPayload): Promise<{ task: Task }> => {
  return fetchJson<{ task: Task }>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteTask = async (id: string): Promise<{ message: string }> => {
  return fetchJson<{ message: string }>(`/tasks/${id}`, {
    method: 'DELETE',
  });
};

export const getOverdueTasks = async (params?: {
  page?: number;
  limit?: number;
}): Promise<TasksResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const queryString = queryParams.toString();
  return fetchJson<TasksResponse>(`/tasks/overdue${queryString ? `?${queryString}` : ''}`);
};

