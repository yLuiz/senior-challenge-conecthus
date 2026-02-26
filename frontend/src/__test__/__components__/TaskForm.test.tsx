import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskForm } from '../../components/TaskForm';

describe('TaskForm', () => {
  it('renders all fields', () => {
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByPlaceholderText('Ex: Estudar NestJS')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Detalhes da tarefa...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows error when submitting without title', async () => {
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText('Criar Tarefa'));

    await waitFor(() => {
      expect(screen.getByText('O título é obrigatório')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with correct data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Ex: Estudar NestJS'), {
      target: { value: 'Minha Tarefa' },
    });
    fireEvent.change(screen.getByPlaceholderText('Detalhes da tarefa...'), {
      target: { value: 'Descrição' },
    });

    fireEvent.click(screen.getByText('Criar Tarefa'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Minha Tarefa', description: 'Descrição' }),
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<TaskForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('pre-fills form when initial data is provided', () => {
    render(
      <TaskForm
        initial={{ id: '1', title: 'Tarefa Existente', status: 'DONE' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      (screen.getByPlaceholderText('Ex: Estudar NestJS') as HTMLInputElement).value,
    ).toBe('Tarefa Existente');
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });
});
