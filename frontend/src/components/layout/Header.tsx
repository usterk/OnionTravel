import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Hamburger Menu & Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="h-9 w-9 p-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="OnionTravel Logo" className="h-10 w-auto" />
              <span className="text-xl font-bold text-gray-900">OnionTravel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-3 md:gap-6">
            {/* User Menu */}
            <div className="flex items-center gap-2 md:gap-3 md:pl-6 md:border-l md:border-gray-200">
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                title="Settings"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors overflow-hidden">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <span className="font-medium hidden md:inline">{user?.username}</span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 h-9 w-9 md:w-auto p-0 md:px-3"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
