/**
 * Testes de integração: Fluxo de autenticação
 *
 * O que está sendo testado:
 *  - ProtectedRoute redireciona usuários não autenticados para /login
 *  - ProtectedRoute concede acesso a usuários autenticados
 *  - Página de login: login bem-sucedido redireciona para a página de tarefas
 *  - Página de login: falha no login exibe a mensagem de erro retornada pela API
 *  - Página de login: exibe estado de carregamento durante o envio do formulário
 *  - Página de login: possui link para a página de registro
 *
 * Estratégia de mock:
 *  - authApi -> impede chamadas HTTP reais; controla as respostas de login/getMe
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/Login';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { mockUser } from './helpers';

// Mocks de módulo
vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
    logout: vi.fn(),
  },
}));

// Referências tipadas aos mocks
import { authApi } from '../api/auth';
const mockedAuthApi = vi.mocked(authApi);

// Auxiliares
/**
 * Renderiza as rotas mínimas necessárias para testar o fluxo de autenticação:
 * "/login" -> LoginPage
 * "/"     -> ProtectedRoute > stub "Página de Tarefas"
 */
function renderAuthFlow(initialRoute = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Página de Tarefas</div>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// Testes
describe('Fluxo de Autenticação (integração)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ProtectedRoute
  describe('ProtectedRoute', () => {
    it('redireciona para /login quando o usuário não está autenticado', async () => {
      // getMe rejeita pois não há token válido no localStorage
      mockedAuthApi.getMe.mockRejectedValue(new Error('Unauthorized'));

      renderAuthFlow('/');

      await waitFor(() => {
        expect(screen.getByText('Entrar na sua conta')).toBeInTheDocument();
      });
    });

    it('exibe o conteúdo protegido quando o usuário está autenticado', async () => {
      localStorage.setItem('token', 'fake-token');
      mockedAuthApi.getMe.mockResolvedValue(mockUser);

      renderAuthFlow('/');

      await waitFor(() => {
        expect(screen.getByText('Página de Tarefas')).toBeInTheDocument();
      });
    });
  });

  // Página de Login
  describe('Página de Login', () => {
    it('renderiza os campos de email, senha e o botão de entrar', async () => {
      mockedAuthApi.getMe.mockRejectedValue(new Error('Unauthorized'));

      renderAuthFlow('/login');

      expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('********')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    });

    it('redireciona para a página de tarefas após login bem-sucedido', async () => {
      // Sem token no localStorage -> useEffect([token]) cai no bloco else (setIsLoading(false))
      // -> getMe NÃO é chamado inicialmente. Após o login definir o token, o useEffect
      // dispara novamente e chama getMe() -> precisa ter sucesso para manter a sessão ativa.
      mockedAuthApi.getMe.mockResolvedValue(mockUser);
      mockedAuthApi.login.mockResolvedValue({
        user: mockUser,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });

      renderAuthFlow('/login');

      fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('********'), {
        target: { value: 'senha123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(mockedAuthApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'senha123',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Página de Tarefas')).toBeInTheDocument();
      });
    });

    it('exibe a mensagem de erro retornada pela API em falha de login', async () => {
      mockedAuthApi.getMe.mockRejectedValue(new Error('Unauthorized'));
      mockedAuthApi.login.mockRejectedValue({
        response: { data: { message: 'Credenciais inválidas' } },
      });

      renderAuthFlow('/login');

      fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
        target: { value: 'errado@email.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('********'), {
        target: { value: 'senhaerrada' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
      });
    });

    it('desabilita o botão e exibe "Entrando..." durante o envio do formulário', async () => {
      mockedAuthApi.getMe.mockRejectedValue(new Error('Unauthorized'));
      // Nunca resolve, pois simula uma requisição lenta
      mockedAuthApi.login.mockImplementation(() => new Promise(() => {}));

      renderAuthFlow('/login');

      fireEvent.change(screen.getByPlaceholderText('seu@email.com'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('********'), {
        target: { value: 'senha123' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: 'Entrando...' });
        expect(btn).toBeInTheDocument();
        expect(btn).toBeDisabled();
      });
    });

    it('contém link para a página de registro', async () => {
      mockedAuthApi.getMe.mockRejectedValue(new Error('Unauthorized'));

      renderAuthFlow('/login');

      expect(screen.getByRole('link', { name: 'Registre-se' })).toBeInTheDocument();
    });
  });
});
