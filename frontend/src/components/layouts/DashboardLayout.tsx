import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { toast } from 'react-hot-toast';

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <nav className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Nav Links */}
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="text-2xl font-bold text-white flex items-center gap-2">
                <span>📬</span>
                <span>Mei Way</span>
              </Link>
              
              <div className="flex gap-4">
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    location.pathname === '/dashboard'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard/contacts"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive('/dashboard/contacts')
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  Contacts
                </Link>
                <Link
                  to="/dashboard/mail-items"
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive('/dashboard/mail-items')
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  Mail Items
                </Link>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-zinc-400 text-sm">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="text-white">
        <Outlet />
      </main>
    </div>
  );
}

