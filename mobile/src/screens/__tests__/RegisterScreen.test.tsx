import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { RegisterScreen } from '../RegisterScreen';

const mockRegister = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

const navigation = { navigate: mockNavigate } as any;
const route = {} as any;

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('renderização', () => {
    it('exibe os campos de nome, email e senha', () => {
      const { getByPlaceholderText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      expect(getByPlaceholderText('Nome')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Mínimo 8 caracteres')).toBeTruthy();
    });

    it('oculta a senha por padrão', () => {
      const { getByPlaceholderText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      expect(getByPlaceholderText('Mínimo 8 caracteres').props.secureTextEntry).toBe(true);
    });
  });

  describe('critérios de senha', () => {
    it('não exibe os critérios enquanto o campo de senha está vazio', () => {
      const { queryByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      expect(queryByText('Mínimo 8 caracteres')).toBeNull();
      expect(queryByText('Uma letra maiúscula (A–Z)')).toBeNull();
      expect(queryByText('Um número (0–9)')).toBeNull();
      expect(queryByText('Um caractere especial (!@#$...)')).toBeNull();
    });

    it('exibe os quatro critérios ao digitar qualquer caractere', () => {
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), 'a');
      expect(getByText('Mínimo 8 caracteres')).toBeTruthy();
      expect(getByText('Uma letra maiúscula (A–Z)')).toBeTruthy();
      expect(getByText('Um número (0–9)')).toBeTruthy();
      expect(getByText('Um caractere especial (!@#$...)')).toBeTruthy();
    });

    it('oculta os critérios quando o campo de senha é limpo', () => {
      const { getByPlaceholderText, queryByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), 'abc');
      fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), '');
      expect(queryByText('Mínimo 8 caracteres')).toBeNull();
    });
  });

  describe('visibilidade da senha', () => {
    it('alterna entre ocultar e exibir ao pressionar o botão', () => {
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.press(getByText('Ver'));
      expect(getByPlaceholderText('Mínimo 8 caracteres').props.secureTextEntry).toBe(false);

      fireEvent.press(getByText('Ocultar'));
      expect(getByPlaceholderText('Mínimo 8 caracteres').props.secureTextEntry).toBe(true);
    });
  });

  describe('validação de formulário', () => {
    it('exibe alerta e não chama register quando os campos estão vazios', () => {
      const { getByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.press(getByText('Criar Conta'));
      expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Preencha todos os campos');
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('exibe alerta e não chama register quando a senha não atende aos critérios', () => {
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Nome'), 'Luiz');
      fireEvent.changeText(getByPlaceholderText('Email'), 'luiz@email.com');
      fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), 'fraca');
      fireEvent.press(getByText('Criar Conta'));
      expect(Alert.alert).toHaveBeenCalledWith(
        'Senha fraca',
        'A senha não atende a todos os critérios de segurança',
      );
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('submissão', () => {
    it('chama register com nome trimado e email em lowercase', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Nome'), '  Luiz  ');
      fireEvent.changeText(getByPlaceholderText('Email'), '  Luiz@Email.com  ');
      fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), 'Senha@123');
      fireEvent.press(getByText('Criar Conta'));
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('Luiz', 'luiz@email.com', 'Senha@123');
      });
    });

    it('exibe mensagem de erro simples retornada pela API', async () => {
      mockRegister.mockRejectedValueOnce({
        response: { data: { message: 'Email já cadastrado' } },
      });
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Nome'), 'Luiz');
      fireEvent.changeText(getByPlaceholderText('Email'), 'luiz@email.com');
      fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), 'Senha@123');
      fireEvent.press(getByText('Criar Conta'));
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Email já cadastrado');
      });
    });

    it('concatena mensagens de erro em array retornadas pela API', async () => {
      mockRegister.mockRejectedValueOnce({
        response: { data: { message: ['campo inválido', 'email obrigatório'] } },
      });
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.changeText(getByPlaceholderText('Nome'), 'Luiz');
      fireEvent.changeText(getByPlaceholderText('Email'), 'luiz@email.com');
      fireEvent.changeText(getByPlaceholderText('Mínimo 8 caracteres'), 'Senha@123');
      fireEvent.press(getByText('Criar Conta'));
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Erro', 'campo inválido\nemail obrigatório');
      });
    });
  });

  describe('navegação', () => {
    it('navega para a tela de login ao pressionar o link', () => {
      const { getByText } = render(
        <RegisterScreen navigation={navigation} route={route} />,
      );
      fireEvent.press(getByText('Entrar'));
      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });
});
