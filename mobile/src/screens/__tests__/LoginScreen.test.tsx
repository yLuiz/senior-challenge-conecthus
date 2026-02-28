import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { LoginScreen } from '../LoginScreen';

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

const navigation = { navigate: mockNavigate } as any;
const route = {} as any;

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('renderização', () => {
    it('exibe os campos de email e senha', () => {
      const { getByPlaceholderText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Senha')).toBeTruthy();
    });

    it('exibe o botão de entrar', () => {
      const { getByText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      expect(getByText('Entrar')).toBeTruthy();
    });

    it('oculta a senha por padrão', () => {
      const { getByPlaceholderText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      expect(getByPlaceholderText('Senha').props.secureTextEntry).toBe(true);
    });
  });

  describe('visibilidade da senha', () => {
    it('alterna entre ocultar e exibir ao pressionar o botão', () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      fireEvent.press(getByText('Ver'));
      expect(getByPlaceholderText('Senha').props.secureTextEntry).toBe(false);

      fireEvent.press(getByText('Ocultar'));
      expect(getByPlaceholderText('Senha').props.secureTextEntry).toBe(true);
    });
  });

  describe('validação de formulário', () => {
    it('exibe alerta e não chama login quando os campos estão vazios', () => {
      const { getByText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      fireEvent.press(getByText('Entrar'));
      expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Preencha todos os campos');
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('exibe alerta e não chama login quando somente o email está preenchido', () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@email.com');
      fireEvent.press(getByText('Entrar'));
      expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Preencha todos os campos');
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('submissão', () => {
    it('chama login com email em lowercase e sem espaços nas extremidades', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Email'), '  Test@Email.com  ');
      fireEvent.changeText(getByPlaceholderText('Senha'), 'minhasenha');
      fireEvent.press(getByText('Entrar'));
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@email.com', 'minhasenha');
      });
    });

    it('exibe alerta de credenciais inválidas quando o login falha', async () => {
      mockLogin.mockRejectedValueOnce({ response: { status: 401 } });
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@email.com');
      fireEvent.changeText(getByPlaceholderText('Senha'), 'senhaerrada');
      fireEvent.press(getByText('Entrar'));
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Email ou senha inválidos');
      });
    });

    it('exibe alerta de erro de conexão quando não há resposta do servidor', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Network Error'));
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@email.com');
      fireEvent.changeText(getByPlaceholderText('Senha'), 'minhasenha');
      fireEvent.press(getByText('Entrar'));
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Erro de Conexão',
          'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
        );
      });
    });
  });

  describe('navegação', () => {
    it('navega para a tela de registro ao pressionar o link', () => {
      const { getByText } = render(
        <LoginScreen navigation={navigation} route={route} />,
      );
      fireEvent.press(getByText('Registre-se'));
      expect(mockNavigate).toHaveBeenCalledWith('Register');
    });
  });
});
