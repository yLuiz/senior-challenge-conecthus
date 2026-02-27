import api from './axios';
import { ApiResponse, Task, TaskFilters } from '../types';

interface PaginatedTasksResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const tasksApi = {
  list: (filters?: TaskFilters, signal?: AbortSignal) =>
    api
      .get<PaginatedTasksResponse>('v1/tasks', {
        params: {
          status: filters?.status,
          dueDate: filters?.dueDateTo,
          dueDateFrom: filters?.dueDateFrom,
          search: filters?.search,
        },
        signal,
      })
      .then((r) => r.data.data),

  get: (id: string) => api.get<ApiResponse<Task>>(`v1/tasks/${id}`).then((r) => r.data.data),

  create: (data: Partial<Task>) =>
    api.post<ApiResponse<Task>>('v1/tasks', data).then((r) => r.data.data),

  update: (id: string, data: Partial<Task>) =>
    api.patch<ApiResponse<Task>>(`v1/tasks/${id}`, data).then((r) => r.data.data),

  remove: (id: string) => api.delete(`v1/tasks/${id}`).then((r) => r.data),
};
