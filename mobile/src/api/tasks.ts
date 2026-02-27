import api from './axios';
import { ApiResponse, Task } from '../types';

export interface TaskFilters {
  status?: string;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export const tasksApi = {
  list: (filters?: TaskFilters) =>
    api.get<{ data: Task[] }>('v1/tasks', { params: filters }).then((r) => r.data.data),

  get: (id: string) => api.get<ApiResponse<Task>>(`v1/tasks/${id}`).then((r) => r.data.data),

  create: (data: Partial<Task>) =>
    api.post<ApiResponse<Task>>('v1/tasks', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Task>) =>
    api.patch<ApiResponse<Task>>(`v1/tasks/${id}`, data).then((r) => r.data.data),

  remove: (id: string) => api.delete(`v1/tasks/${id}`).then((r) => r.data),
};
