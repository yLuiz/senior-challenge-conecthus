import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { Task, User } from '../types';

export const mockUser: User = {
  id: 'user1',
  name: 'Test User',
  email: 'test@example.com',
  createdAt: new Date().toISOString(),
};

export const mockTasks: Task[] = [
  {
    id: 'task1',
    title: 'Tarefa 1',
    description: 'Descrição 1',
    status: 'TODO',
    userId: 'user1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'task2',
    title: 'Tarefa 2',
    description: 'Descrição 2',
    status: 'IN_PROGRESS',
    userId: 'user1',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

interface WrapperOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { initialRoute = '/', ...renderOptions }: WrapperOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
