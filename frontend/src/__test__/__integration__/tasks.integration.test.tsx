/**
 * Testes de integração: Página de Tarefas
 *
 * O que está sendo testado:
 *  - A lista de tarefas é carregada da API na montagem e renderizada na tela
 *  - Estado vazio é exibido quando a API retorna uma lista vazia
 *  - Estado de carregamento é exibido enquanto a requisição está em andamento
 *  - Criar uma tarefa chama a API e adiciona a nova tarefa à lista
 *  - O modal fecha após a criação bem-sucedida de uma tarefa
 *  - Excluir uma tarefa chama a API e a remove da lista
 *  - A exclusão é cancelada quando o usuário dispensa o diálogo de confirmação
 *  - Alterar o status de uma tarefa chama a API de atualização com o novo status
 *  - O filtro de status envia o status selecionado para a API
 *  - O filtro de intervalo de datas envia dueDateFrom / dueDateTo para a API
 *  - O filtro de busca aplica debounce antes de chamar a API
 *  - Clicar em "Limpar" redefine todos os campos de filtro
 *  - Uma mensagem MQTT recebida dispara um novo fetch da lista de tarefas
 *
 * Estratégia de mock:
 *  - authApi.getMe -> simula um usuário autenticado (retorna mockUser)
 *  - tasksApi -> controla todas as respostas de CRUD sem chamadas HTTP reais
 *  - mqtt -> captura o callback do evento 'message' para que os testes
 *            possam simular mensagens recebidas do broker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { TasksPage } from '../../pages/Tasks';
import { mockUser, mockTasks } from '../helpers';
import { Task } from '../../types';

// Mocks de módulo
vi.mock('../../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('@/api/tasks', () => ({
  tasksApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

/**
 * É capturado o handler do evento 'message' do MQTT para que os testes possam
 * simular mensagens recebidas do broker sem uma conexão WebSocket real.
 */
type MqttMessageHandler = (topic: string, message: { toString(): string }) => void;
let mqttMessageHandler: MqttMessageHandler | null = null;

const mockMqttClient = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (event === 'message') mqttMessageHandler = handler as MqttMessageHandler;
    if (event === 'connect') handler();
  }),
  subscribe: vi.fn(),
  end: vi.fn(),
};

vi.mock('mqtt', () => ({
  default: { connect: vi.fn(() => mockMqttClient) },
}));

import { authApi } from '../../api/auth';
import { tasksApi } from '@/api/tasks';

const mockedAuthApi = vi.mocked(authApi);
const mockedTasksApi = vi.mocked(tasksApi);

function renderTasksPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function waitForTasksLoaded() {
  await waitFor(() => {
    expect(screen.getByText('Tarefa 1')).toBeInTheDocument();
  });
}

beforeEach(() => {
  localStorage.setItem('token', 'fake-token');
  mqttMessageHandler = null;
  vi.clearAllMocks();
  mockMqttClient.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    if (event === 'message') mqttMessageHandler = handler as MqttMessageHandler;
    if (event === 'connect') handler();
  });

  mockedAuthApi.getMe.mockResolvedValue(mockUser);
  mockedTasksApi.list.mockResolvedValue([...mockTasks]);

  mockedTasksApi.create.mockImplementation(async (data: Partial<Task>) => ({
    id: 'task-new',
    title: data.title!,
    description: data.description ?? '',
    status: data.status ?? 'TODO',
    userId: 'user1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  mockedTasksApi.update.mockImplementation(async (id: string, data: Partial<Task>) => ({
    ...mockTasks.find((t) => t.id === id)!,
    ...data,
    updatedAt: new Date().toISOString(),
  }));

  mockedTasksApi.remove.mockResolvedValue(undefined);
});

afterEach(() => {
  localStorage.clear();
});

describe('Página de Tarefas (integração)', () => {

  describe('Carregamento de tarefas', () => {
    it('chama tasksApi.list e renderiza as tarefas retornadas', async () => {
      renderTasksPage();

      await waitFor(() => {
        expect(mockedTasksApi.list).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByText('Tarefa 1')).toBeInTheDocument();
        expect(screen.getByText('Tarefa 2')).toBeInTheDocument();
      });
    });

    it('exibe a mensagem de estado vazio quando a API retorna lista vazia', async () => {
      mockedTasksApi.list.mockResolvedValue([]);

      renderTasksPage();

      await waitFor(() => {
        expect(screen.getByText('Nenhuma tarefa encontrada.')).toBeInTheDocument();
      });
    });

    it('exibe "Carregando tarefas..." enquanto a requisição está em andamento', async () => {
      // Nunca resolve a promise, mantém o estado de carregamento visível
      mockedTasksApi.list.mockImplementation(() => new Promise(() => {}));

      renderTasksPage();

      // ProtectedRoute exibe "Carregando..." enquanto getMe resolve a promise;
      // só após isso o TasksPage monta e exibe "Carregando tarefas..."
      await waitFor(() => {
        expect(screen.getByText('Carregando tarefas...')).toBeInTheDocument();
      });
    });
  });

  describe('Criação de tarefas', () => {
    it('chama tasksApi.create e exibe a nova tarefa na lista', async () => {
      renderTasksPage();
      await waitForTasksLoaded();

      fireEvent.click(screen.getByText('+ Nova Tarefa'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ex: Estudar NestJS')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Ex: Estudar NestJS'), {
        target: { value: 'Tarefa de Integração' },
      });
      fireEvent.click(screen.getByText('Criar Tarefa'));

      await waitFor(() => {
        expect(mockedTasksApi.create).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Tarefa de Integração' }),
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Tarefa de Integração')).toBeInTheDocument();
      });
    });

    it('fecha o modal após a criação bem-sucedida', async () => {
      renderTasksPage();
      await waitForTasksLoaded();

      fireEvent.click(screen.getByText('+ Nova Tarefa'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Ex: Estudar NestJS')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Ex: Estudar NestJS'), {
        target: { value: 'Qualquer Tarefa' },
      });
      fireEvent.click(screen.getByText('Criar Tarefa'));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Ex: Estudar NestJS')).not.toBeInTheDocument();
      });
    });
  });

  describe('Exclusão de tarefas', () => {
    it('chama tasksApi.remove e remove a tarefa da lista após confirmação', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderTasksPage();
      await waitForTasksLoaded();

      const deleteButtons = screen.getAllByTitle('Excluir tarefa');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockedTasksApi.remove).toHaveBeenCalledWith('task1');
      });

      await waitFor(() => {
        expect(screen.queryByText('Tarefa 1')).not.toBeInTheDocument();
      });
    });

    it('não remove a tarefa quando o usuário cancela a confirmação', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderTasksPage();
      await waitForTasksLoaded();

      const deleteButtons = screen.getAllByTitle('Excluir tarefa');
      fireEvent.click(deleteButtons[0]);

      expect(mockedTasksApi.remove).not.toHaveBeenCalled();
      expect(screen.getByText('Tarefa 1')).toBeInTheDocument();
    });
  });

  describe('Atualização de status', () => {
    it('chama tasksApi.update com o novo status ao alterar o select do card', async () => {
      renderTasksPage();
      await waitForTasksLoaded();

      // getAllByRole('combobox') retorna: [filtro-status, select-card1, select-card2]
      const taskSelects = screen.getAllByRole('combobox');
      // O select do primeiro card
      fireEvent.change(taskSelects[1], { target: { value: 'DONE' } });

      await waitFor(() => {
        expect(mockedTasksApi.update).toHaveBeenCalledWith('task1', { status: 'DONE' });
      });
    });
  });

  describe('Filtros', () => {
    it('envia o status selecionado para tasksApi.list', async () => {
      renderTasksPage();
      await waitForTasksLoaded();

      // O primeiro combobox da página é o filtro de status (acima dos cards)
      const statusFilter = screen.getAllByRole('combobox')[0];
      fireEvent.change(statusFilter, { target: { value: 'TODO' } });

      await waitFor(() => {
        expect(mockedTasksApi.list).toHaveBeenLastCalledWith(
          expect.objectContaining({ status: 'TODO' }),
          expect.anything(), // AbortSignal
        );
      });
    });

    it('envia dueDateFrom para tasksApi.list ao selecionar data inicial', async () => {
      const { container } = renderTasksPage();
      await waitForTasksLoaded();

      const dateInputs = container.querySelectorAll('input[type="date"]');
      // Primeiro input de data -> "Vence a partir de"
      fireEvent.change(dateInputs[0], { target: { value: '2026-03-01' } });

      await waitFor(() => {
        expect(mockedTasksApi.list).toHaveBeenLastCalledWith(
          expect.objectContaining({ dueDateFrom: '2026-03-01' }),
          expect.anything(),
        );
      });
    });

    it('envia dueDateTo para tasksApi.list ao selecionar data final', async () => {
      const { container } = renderTasksPage();
      await waitForTasksLoaded();

      const dateInputs = container.querySelectorAll('input[type="date"]');
      // Segundo input de data -> "Vence até"
      fireEvent.change(dateInputs[1], { target: { value: '2026-03-31' } });

      await waitFor(() => {
        expect(mockedTasksApi.list).toHaveBeenLastCalledWith(
          expect.objectContaining({ dueDateTo: '2026-03-31' }),
          expect.anything(),
        );
      });
    });

    it('aplica debounce na busca por texto antes de chamar tasksApi.list', async () => {
      // Usamos timers reais para evitar conflito entre fake timers e o polling
      // interno do waitFor (que também usa setTimeout para tentar novamente)
      renderTasksPage();
      await waitForTasksLoaded();

      const callsBefore = mockedTasksApi.list.mock.calls.length;
      const searchInput = screen.getByPlaceholderText('Buscar tarefas...');

      fireEvent.change(searchInput, { target: { value: 'NestJS' } });

      // Antes do debounce disparar uma nova chamada, confirma que nenhuma foi feita
      expect(mockedTasksApi.list.mock.calls.length).toBe(callsBefore);

      // Aguarda os 350ms de debounce (+ margem de segurança)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
      });

      await waitFor(() => {
        expect(mockedTasksApi.list).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'NestJS' }),
          expect.anything(),
        );
      });
    }, 10_000);

    it('limpa o campo de busca e os filtros ao clicar em "Limpar"', async () => {
      renderTasksPage();
      await waitForTasksLoaded();

      const searchInput = screen.getByPlaceholderText('Buscar tarefas...');
      fireEvent.change(searchInput, { target: { value: 'texto qualquer' } });
      expect((searchInput as HTMLInputElement).value).toBe('texto qualquer');

      fireEvent.click(screen.getByText('Limpar'));

      expect((searchInput as HTMLInputElement).value).toBe('');
    });
  });

  describe('Notificações MQTT', () => {
    it('refaz o fetch ao receber uma mensagem no tópico do usuário', async () => {
      renderTasksPage();
      await waitForTasksLoaded();

      const newTask: Task = {
        id: 'task-mqtt',
        title: 'Tarefa via MQTT',
        description: '',
        status: 'TODO',
        userId: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockedTasksApi.list.mockResolvedValueOnce([...mockTasks, newTask]);

      const callsBefore = mockedTasksApi.list.mock.calls.length;

      // Simula uma notificação MQTT recebida
      act(() => {
        mqttMessageHandler?.(
          `tasks/notifications/${mockUser.id}`,
          { toString: () => JSON.stringify({ id: newTask.id, title: newTask.title }) },
        );
      });

      await waitFor(() => {
        expect(mockedTasksApi.list.mock.calls.length).toBeGreaterThan(callsBefore);
      });

      await waitFor(() => {
        expect(screen.getByText('Tarefa via MQTT')).toBeInTheDocument();
      });
    });

    it('ignora mensagens MQTT inválidas (não-JSON)', async () => {
      renderTasksPage();
      await waitForTasksLoaded();

      const callsBefore = mockedTasksApi.list.mock.calls.length;

      // JSON inválido não deve disparar um novo fetch
      act(() => {
        mqttMessageHandler?.(
          `tasks/notifications/${mockUser.id}`,
          { toString: () => 'not-valid-json' },
        );
      });

      // Aguarda um tick e confirma que nenhuma chamada extra foi feita
      await act(async () => {});
      expect(mockedTasksApi.list.mock.calls.length).toBe(callsBefore);
    });
  });
});
