import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/conecthus_logo.svg';
import styles from './ProtectedRoute.module.css';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.screen}>
        <img src={logo} alt="Conecthus" className={styles.logo} />
        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
