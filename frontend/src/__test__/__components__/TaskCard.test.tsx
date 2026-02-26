import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '../../components/TaskCard';
import { Task } from '../../types';

const mockTask: Task = {
  id: '1',
  title: 'Estudar NestJS',
  description: 'Ler a documentação oficial',
  status: 'TODO',
  userId: 'user1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('TaskCard', () => {
  it('renders task title and status', () => {
    render(
      <TaskCard
        task={mockTask}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Estudar NestJS')).toBeInTheDocument();
    expect(screen.getByText('A Fazer', { selector: 'span' })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <TaskCard
        task={mockTask}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Ler a documentação oficial')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onClick={onClick}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Estudar NestJS'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onClick={vi.fn()}
        onDelete={onDelete}
        onStatusChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTitle('Excluir tarefa'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onStatusChange when status select changes', () => {
    const onStatusChange = vi.fn();
    render(
      <TaskCard
        task={mockTask}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DONE' } });
    expect(onStatusChange).toHaveBeenCalledWith('DONE');
  });
});
