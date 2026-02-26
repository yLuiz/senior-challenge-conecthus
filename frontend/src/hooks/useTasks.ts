import { useCallback, useEffect, useState } from 'react';
import { Task, TaskFilters } from '../types';

import { tasksApi } from '@/api/tasks';
import { useAuth } from '@/context/AuthContext';
import { useMqttNotifications } from './useMqttNotifications';

export function useTasks(filters?: TaskFilters) {

  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tasksApi.list(filters);
      setTasks(data);
    } catch {
      setError('Erro ao carregar tarefas');
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useMqttNotifications(user?.id, fetchTasks);

  const createTask = async (data: Partial<Task>) => {
    const task = await tasksApi.create(data);
    setTasks((prev) => [task, ...prev]);
    return task;
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    const updated = await tasksApi.update(id, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  const removeTask = async (id: string) => {
    await tasksApi.remove(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return { tasks, isLoading, error, refetch: fetchTasks, createTask, updateTask, removeTask };
}
