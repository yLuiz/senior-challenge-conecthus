import { Task, TaskStatus } from '../types';
import styles from './TaskCard.module.css';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Progresso',
  DONE: 'Concluída',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#6b7280',
  IN_PROGRESS: '#d97706',
  DONE: '#059669',
};

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
}

export function TaskCard({ task, onClick, onDelete, onStatusChange }: TaskCardProps) {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <h3 className={styles.title}>{task.title}</h3>
        <span
          className={styles.badge}
          style={{ background: STATUS_COLORS[task.status] }}
        >
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      {task.description && (
        <p className={styles.description}>{task.description}</p>
      )}

      {task.dueDate && (
        <p className={styles.dueDate}>
          Vence: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
        </p>
      )}

      <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className={styles.select}
        >
          <option value="TODO">A Fazer</option>
          <option value="IN_PROGRESS">Em Progresso</option>
          <option value="DONE">Concluída</option>
        </select>
        <button
          onClick={onDelete}
          className={styles.deleteBtn}
          title="Excluir tarefa"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
