import { useTasks } from '@/hooks/useTasks';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { Layout } from '../components/Layout';
import { TaskCard } from '../components/TaskCard';
import { TaskCardSkeleton } from '../components/TaskCardSkeleton';
import { TaskForm } from '../components/TaskForm';
import { Task, TaskFilters, TaskStatus } from '../types';
import styles from './Tasks.module.css';

export function TasksPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput || undefined }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);
  const { tasks, isLoading, isLoadingMore, hasMore, error, loadMore, createTask, updateTask, removeTask } = useTasks(filters);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !isLoadingMore) loadMore(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const handleCreate = async (data: Partial<Task>) => {
    setIsSaving(true);
    try {
      await createTask(data);
      setShowForm(false);
      toast.success('Tarefa criada com sucesso!');
    } catch {
      toast.error('Erro ao criar tarefa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    try {
      await updateTask(task.id, { status });
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = (id: string) => setPendingDeleteId(id);

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setPendingDeleteId(null);
    try {
      await removeTask(pendingDeleteId);
      toast.success('Tarefa excluída!');
    } catch {
      toast.error('Erro ao excluir tarefa');
    }
  };

  return (
    <Layout>
      <div className={styles.header}>
        <h1 className={styles.title}>Minhas Tarefas</h1>
        <button onClick={() => setShowForm(true)} className={styles.newBtn}>
          + Nova Tarefa
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: (e.target.value as TaskStatus) || undefined,
            }))
          }
          className={styles.filterSelect}
        >
          <option value="">Todos os status</option>
          <option value="TODO">A Fazer</option>
          <option value="IN_PROGRESS">Em Progresso</option>
          <option value="DONE">Concluídas</option>
        </select>

        <input
          type="text"
          placeholder="Buscar tarefas..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={styles.filterInput}
        />

        <div className={styles.dateFilter}>
          <span className={styles.filterLabel}>Vence a partir de</span>
          <input
            type="date"
            value={filters.dueDateFrom ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, dueDateFrom: e.target.value || undefined }))
            }
            className={styles.filterInput}
          />
        </div>

        <div className={styles.dateFilter}>
          <span className={styles.filterLabel}>Vence até</span>
          <input
            type="date"
            value={filters.dueDateTo ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, dueDateTo: e.target.value || undefined }))
            }
            className={styles.filterInput}
          />
        </div>

        <button
          onClick={() => { setFilters({}); setSearchInput(''); }}
          className={styles.clearBtn}
        >
          Limpar
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Nova Tarefa</h2>
            <TaskForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isLoading={isSaving}
            />
          </div>
        </div>
      )}

      {/* Task list */}
      {error && <p className={styles.stateError}>{error}</p>}

      {!isLoading && !error && tasks.length === 0 && (
        <div className={styles.empty}>
          <p>Nenhuma tarefa encontrada.</p>
          <button onClick={() => setShowForm(true)} className={styles.newBtn}>
            Criar primeira tarefa
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <TaskCardSkeleton key={i} />)
          : tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => navigate(`/tasks/${task.id}`)}
                onDelete={() => handleDelete(task.id)}
                onStatusChange={(status) => handleStatusChange(task, status)}
              />
            ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className={styles.sentinel} />

      {isLoadingMore && (
        <div className={styles.loadingMore}>
          <span className={styles.spinner} />
          <span>Carregando mais tarefas...</span>
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmModal
          title="Excluir tarefa"
          message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </Layout>
  );
}
