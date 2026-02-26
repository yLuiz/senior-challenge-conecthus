import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TasksPage } from './pages/TasksPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
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
    </BrowserRouter>
  );
}
