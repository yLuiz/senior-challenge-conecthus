import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import toast from 'react-hot-toast';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      toast.success('Tarefa atualizada!');
    } catch {
      toast.error('Erro ao atualizar tarefa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setShowDeleteConfirm(false);
    try {
      await tasksApi.remove(task.id);
      toast.success('Tarefa excluída!');
      navigate('/');
    } catch {
      toast.error('Erro ao excluir tarefa');
    }
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

            {task.description
              ? <p className={styles.description}>{task.description}</p>
              : <p className={styles.descriptionEmpty}>Sem descrição</p>
            }

            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <CalendarTodayIcon sx={{ fontSize: 14 }} />
                Vence: {task.dueDate ? task.dueDate.split('T')[0].split('-').reverse().join('/') : '-'}
              </span>
              <span className={styles.metaItem}>
                <AccessTimeIcon sx={{ fontSize: 14 }} />
                Criada: {new Date(task.createdAt).toLocaleDateString('pt-BR')}
              </span>
              <span className={styles.metaItem}>
                <EditIcon sx={{ fontSize: 14 }} />
                Atualizada: {new Date(task.updatedAt).toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className={styles.actions}>
              <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                <EditIcon sx={{ fontSize: 16 }} /> Editar
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className={styles.deleteBtn}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} /> Excluir
              </button>
            </div>
          </>
        )}
      </div>
      {showDeleteConfirm && (
        <ConfirmModal
          title="Excluir tarefa"
          message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </Layout>
  );
}
