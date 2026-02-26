import { useState } from 'react';
import { Task, TaskStatus } from '../types';
import styles from './TaskForm.module.css';

interface TaskFormProps {
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaskForm({ initial, onSubmit, onCancel, isLoading }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'TODO');
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ? initial.dueDate.split('T')[0] : '',
  );
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('O título é obrigatório');
      return;
    }
    setError('');
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.field}>
        <label className={styles.label}>Título *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={styles.input}
          placeholder="Ex: Estudar NestJS"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.textarea}
          rows={3}
          placeholder="Detalhes da tarefa..."
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className={styles.select}
          >
            <option value="TODO">A Fazer</option>
            <option value="IN_PROGRESS">Em Progresso</option>
            <option value="DONE">Concluída</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Data de Vencimento</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.buttons}>
        <button type="button" onClick={onCancel} className={styles.cancelBtn}>
          Cancelar
        </button>
        <button type="submit" className={styles.submitBtn} disabled={isLoading}>
          {isLoading ? 'Salvando...' : initial?.id ? 'Salvar' : 'Criar Tarefa'}
        </button>
      </div>
    </form>
  );
}
