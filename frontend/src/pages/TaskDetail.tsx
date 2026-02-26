import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { TaskForm } from '../components/TaskForm';
import { tasksApi } from '../api/tasks';
import { Task, TaskStatus } from '../types';
import styles from './TaskDetail.module.css';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Progresso',
  DONE: 'Concluída',
};

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    tasksApi
      .get(id)
      .then(setTask)
      .catch(() => navigate('/'))
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  const handleUpdate = async (data: Partial<Task>) => {
    if (!task) return;
    setIsSaving(true);
    try {
      const updated = await tasksApi.update(task.id, data);
      setTask(updated);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Deseja excluir esta tarefa?')) return;
    await tasksApi.remove(task.id);
    navigate('/');
  };

  if (isLoading) {
    return (
      <Layout>
        <p className={styles.state}>Carregando...</p>
      </Layout>
    );
  }

  if (!task) return null;

  return (
    <Layout>
      <button onClick={() => navigate('/')} className={styles.back}>
        ← Voltar
      </button>

      <div className={styles.card}>
        {isEditing ? (
          <>
            <h2 className={styles.editTitle}>Editar Tarefa</h2>
            <TaskForm
              initial={task}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isLoading={isSaving}
            />
          </>
        ) : (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>{task.title}</h1>
              <span className={styles.status}>{STATUS_LABELS[task.status]}</span>
            </div>

            {task.description && (
              <p className={styles.description}>{task.description}</p>
            )}

            <div className={styles.meta}>
              {task.dueDate && (
                <span>
                  📅 Vence: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                </span>
              )}
              <span>
                🕒 Criada: {new Date(task.createdAt).toLocaleDateString('pt-BR')}
              </span>
              <span>
                ✏️ Atualizada: {new Date(task.updatedAt).toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className={styles.actions}>
              <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                Editar
              </button>
              <button onClick={handleDelete} className={styles.deleteBtn}>
                Excluir
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
