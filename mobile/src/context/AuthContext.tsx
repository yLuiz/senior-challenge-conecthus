import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { authApi } from '../api/auth';

interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          const me = await authApi.getMe();
          setUser(me);
        }
      } catch {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password });

    await Promise.all([
      AsyncStorage.setItem('token', data.access_token),
      AsyncStorage.setItem('user', JSON.stringify(data.user)),
    ]);

    setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await authApi.register({ name, email, password });

    await Promise.all([
      AsyncStorage.setItem('token', data.access_token),
      AsyncStorage.setItem('user', JSON.stringify(data.user))
    ]);

    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem('token'),
      AsyncStorage.removeItem('user'),
    ]);

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
