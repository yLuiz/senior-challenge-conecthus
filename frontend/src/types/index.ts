export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export interface ApiError {
  message: string | string[];
  statusCode?: number;
  error?: string;
}

export interface ApiResponse<T> {
  data: T;
}
