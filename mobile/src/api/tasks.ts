import api from './axios';
import { Task } from '../types';

export interface TaskFilters {
  status?: string;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export const tasksApi = {
  list: (filters?: TaskFilters) =>
    api.get<Task[]>('v1/tasks', { params: filters }).then((r) => r.data),

  get: (id: string) => api.get<Task>(`/tasks/${id}`).then((r) => r.data),

  create: (data: Partial<Task>) =>
    api.post<Task>('v1/tasks', data).then((r) => r.data),

  update: (id: string, data: Partial<Task>) =>
    api.patch<Task>(`v1/tasks/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`v1/tasks/${id}`).then((r) => r.data),
};
