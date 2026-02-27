import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { ApiError } from '../types';
import styles from './Auth.module.css';
import logo from '../assets/conecthus_logo.png';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const passwordCriteria = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Uma letra maiúscula (A–Z)', met: /[A-Z]/.test(password) },
    { label: 'Um número (0–9)', met: /\d/.test(password) },
    { label: 'Um caractere especial (!@#$...)', met: /[\W_]/.test(password) },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordCriteria.some((c) => !c.met)) {
      setError('A senha não atende a todos os critérios de segurança');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: unknown) {
      if (axios.isAxiosError<ApiError>(err)) {
        const apiMessage = err.response?.data?.message;
        setError(Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage ?? 'Erro ao criar conta');
      } else {
        setError('Erro ao criar conta');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img src={logo} alt="Conecthus" className={styles.logoCircle} />
        <h1 className={styles.title}>Task Manager</h1>
        <h2 className={styles.subtitle}>Criar nova conta</h2>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="Seu nome"
              required
            />
          </div>

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
                placeholder="Mínimo 8 caracteres"
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
            {password.length > 0 && (
              <ul className={styles.criteria}>
                {passwordCriteria.map(({ label, met }) => (
                  <li key={label} className={met ? styles.criterionMet : styles.criterionUnmet}>
                    {met
                      ? <CheckCircleIcon sx={{ fontSize: 12 }} />
                      : <RadioButtonUncheckedIcon sx={{ fontSize: 12 }} />}
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" className={styles.btn} disabled={isLoading}>
            {isLoading ? 'Criando...' : 'Criar Conta'}
          </button>
        </form>

        <p className={styles.footer}>
          Ja tem conta?{' '}
          <Link to="/login" className={styles.link}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}