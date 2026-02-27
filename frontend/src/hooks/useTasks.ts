import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Task, TaskFilters } from '../types';

import { tasksApi } from '@/api/tasks';
import { useAuth } from '@/context/AuthContext';
import { useMqttNotifications } from './useMqttNotifications';

const PAGE_SIZE = 10;

export function useTasks(filters?: TaskFilters) {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useRef so loadMore always reads the current page without closure staleness
  const pageRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number, mode: 'replace' | 'append') => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (mode === 'replace') {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const result = await tasksApi.list(
          { ...filters, page: pageNum, limit: PAGE_SIZE },
          abortRef.current.signal,
        );
        setTasks((prev) =>
          mode === 'append' ? [...prev, ...result.data] : result.data,
        );
        pageRef.current = pageNum;
        setHasMore(pageNum < result.meta.totalPages);
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (mode === 'replace') setError('Erro ao carregar tarefas');
      } finally {
        if (mode === 'replace') setIsLoading(false);
        else setIsLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filters)],
  );

  // Reset and reload from page 1 whenever filters change
  useEffect(() => {
    fetchPage(1, 'replace');
    return () => abortRef.current?.abort();
  }, [fetchPage]);

  // MQTT: task events reload from page 1 to stay consistent
  useMqttNotifications(user?.id, () => fetchPage(1, 'replace'));

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore) {
      fetchPage(pageRef.current + 1, 'append');
    }
  }, [isLoading, isLoadingMore, fetchPage]);

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

  return {
    tasks,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch: () => fetchPage(1, 'replace'),
    createTask,
    updateTask,
    removeTask,
  };
}
