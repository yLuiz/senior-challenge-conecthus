import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { ApiError } from '../types';
import styles from './Auth.module.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiError>(err)) {
        const apiMessage = err.response?.data?.message;
        setError(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage ?? 'Email ou senha invalidos');
      } else {
        setError('Email ou senha invalidos');
      }
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Task Manager</h1>
        <h2 className={styles.subtitle}>Entrar na sua conta</h2>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Senha</label>
            <div className={styles.passwordField}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${styles.passwordInput}`}
                placeholder="********"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.btn} disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className={styles.footer}>
          Nao tem conta?{' '}
          <Link to="/register" className={styles.link}>
            Registre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
