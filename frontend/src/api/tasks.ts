import api from './axios';
import { Task, TaskFilters } from '../types';

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

  get: (id: string) => api.get<Task>(`v1/tasks/${id}`).then((r) => r.data),

  create: (data: Partial<Task>) =>
    api.post<Task>('v1/tasks', data).then((r) => r.data),

  update: (id: string, data: Partial<Task>) =>
    api.patch<Task>(`v1/tasks/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`v1/tasks/${id}`).then((r) => r.data),
};
