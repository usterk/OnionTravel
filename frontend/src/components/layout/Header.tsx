import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Home, Map, LogOut, User } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
              <Map className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">OnionTravel</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <Link
              to="/trips"
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Map className="h-4 w-4" />
              <span className="font-medium">Trips</span>
            </Link>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="font-medium">{user?.username}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
