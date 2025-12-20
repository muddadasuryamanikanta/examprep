import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SpaceList from './pages/SpaceList';
import SubjectLibrary from './pages/SubjectLibrary';
import TopicList from './pages/TopicList';
import TopicCanvas from './pages/TopicCanvas';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { AuthSuccess } from './pages/AuthSuccess';
import { Navbar } from './components/common/Navbar';
import { useAuthStore } from './store/authStore';

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/spaces" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        <Navbar />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/auth-success" element={<AuthSuccess />} />
          
          <Route path="/" element={<Navigate to="/spaces" replace />} />
          
          <Route path="/spaces" element={
            <RequireAuth>
              <SpaceList />
            </RequireAuth>
          } />
          <Route path="/spaces/:spaceId/library" element={
            <RequireAuth>
              <SubjectLibrary />
            </RequireAuth>
          } />
          <Route path="/spaces/:spaceId/:subjectId" element={
            <RequireAuth>
              <TopicList />
            </RequireAuth>
          } />
          <Route path="/spaces/:spaceId/:subjectId/:topicId" element={
            <RequireAuth>
              <TopicCanvas />
            </RequireAuth>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
