import api from './axios';
import { ApiResponse, Task } from '../types';

export interface TaskFilters {
  status?: string;
  search?: string;
  dueDateFrom?: string;
  dueDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedTasks {
  data: Task[];
  meta: PaginationMeta;
}

export const tasksApi = {
  list: (filters?: TaskFilters) =>
    api.get<PaginatedTasks>('v1/tasks', { params: filters }).then((r) => r.data),

  get: (id: string) => api.get<ApiResponse<Task>>(`v1/tasks/${id}`).then((r) => r.data.data),

  create: (data: Partial<Task>) =>
    api.post<ApiResponse<Task>>('v1/tasks', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Task>) =>
    api.patch<ApiResponse<Task>>(`v1/tasks/${id}`, data).then((r) => r.data.data),

  remove: (id: string) => api.delete(`v1/tasks/${id}`).then((r) => r.data),
};
