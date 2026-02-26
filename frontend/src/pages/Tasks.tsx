import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { TaskCard } from '../components/TaskCard';
import { TaskForm } from '../components/TaskForm';
import { Task, TaskFilters, TaskStatus } from '../types';
import styles from './Tasks.module.css';

export function TasksPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { tasks, isLoading, error, createTask, updateTask, removeTask } = useTasks(filters);
  const { logout } = useAuth();

  const handleCreate = async (data: Partial<Task>) => {
    setIsSaving(true);
    try {
      await createTask(data);
      setShowForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (task: Task, status: TaskStatus) => {
    await updateTask(task.id, { status });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta tarefa?')) {
      await removeTask(id);
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
          value={filters.search ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, search: e.target.value || undefined }))
          }
          className={styles.filterInput}
        />

        <input
          type="date"
          placeholder="De"
          value={filters.dueDateFrom ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, dueDateFrom: e.target.value || undefined }))
          }
          className={styles.filterInput}
        />

        <input
          type="date"
          placeholder="Até"
          value={filters.dueDateTo ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, dueDateTo: e.target.value || undefined }))
          }
          className={styles.filterInput}
        />

        <button
          onClick={() => setFilters({})}
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
      {isLoading && <p className={styles.state}>Carregando tarefas...</p>}
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
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => navigate(`/tasks/${task.id}`)}
            onDelete={() => handleDelete(task.id)}
            onStatusChange={(status) => handleStatusChange(task, status)}
          />
        ))}
      </div>
    </Layout>
  );
}
