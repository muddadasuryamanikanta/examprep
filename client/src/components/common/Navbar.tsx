import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between mx-auto max-w-7xl px-4 md:px-8">
        <Link to="/" className="mr-6 flex items-center space-x-2 font-bold text-xl">
          <span>
            {isAuthenticated && user?.name 
              ? `${user.name.split(' ')[0]}Prep` 
              : 'ExamPrep'}
          </span>
        </Link>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="rounded-full"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 transition-all" />
            ) : (
              <Moon className="h-5 w-5 transition-all" />
            )}
          </Button>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="hidden md:inline-block text-sm font-medium text-muted-foreground">
                {user?.name || user?.email || 'User'}
              </span>
              <Button onClick={handleLogout} variant="secondary" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            !isAuthPage && (
              <Button onClick={() => navigate('/login')} size="sm">
                <User className="mr-2 h-4 w-4" />
                Login
              </Button>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
