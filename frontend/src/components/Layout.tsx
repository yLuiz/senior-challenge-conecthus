import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <Link to="/" className={styles.logoLink}>
          <span className={styles.logoText}>Task Manager</span>
        </Link>
        <nav className={styles.nav}>
          {user && (
            <>
              <span className={styles.username}>Olá, {user.name}</span>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Sair
              </button>
            </>
          )}
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
