import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Languages, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import toast from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api-client.ts';

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentLanguage, setCurrentLanguage] = useState<'EN' | 'CN' | 'BOTH'>('EN');
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [gmailAddress, setGmailAddress] = useState<string | null>(null);

  // Gmail status check function - defined before useEffect
  const checkGmailStatus = useCallback(async () => {
    try {
      const response = await api.oauth.getGmailStatus();
      setGmailConnected(response.connected);
      setGmailAddress(response.gmailAddress);
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setGmailConnected(false);
    }
  }, []);

  // Check Gmail connection status on mount and when location changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkGmailStatus(); // Explicitly ignore the promise
  }, [location.pathname, checkGmailStatus]); // Re-check when navigating between pages

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/signin');
    } catch {
      toast.error('Error signing out');
    }
  };

  const handleLanguageChange = (lang: 'EN' | 'CN' | 'BOTH') => {
    setCurrentLanguage(lang);
    toast('🚧 Language switching feature coming soon!', {
      icon: '🔜',
      duration: 3000,
    });
    // TODO: Implement actual language switching logic
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center">
              <h1 className="text-2xl font-bold text-brand">Mei Way Mail Plus</h1>
            </Link>

            {/* Language Toggle & User */}
            <div className="flex items-center gap-4">
              {/* Gmail Status Indicator */}
              {gmailConnected !== null && (
                <Link
                  to="/dashboard/settings"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    gmailConnected
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 animate-pulse'
                  }`}
                  title={gmailConnected ? `Gmail connected: ${gmailAddress}` : 'Gmail disconnected - Click to connect'}
                >
                  {gmailConnected ? (
                    <>
                      <Mail className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">Gmail Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium hidden sm:inline">Connect Gmail</span>
                    </>
                  )}
                </Link>
              )}
              
              {/* Language Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 border border-gray-300">
                <button
                  onClick={() => handleLanguageChange('EN')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentLanguage === 'EN'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="English (Coming Soon)"
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageChange('CN')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentLanguage === 'CN'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="中文 (Coming Soon)"
                >
                  中文
                </button>
                <button
                  onClick={() => handleLanguageChange('BOTH')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentLanguage === 'BOTH'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Bilingual (Coming Soon)"
                >
                  <Languages className="w-4 h-4" />
                  <span>Both</span>
                </button>
              </div>
              
              {/* User info & Sign Out */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-full p-1 w-fit mb-6">
            <Link
              to="/dashboard"
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                location.pathname === '/dashboard'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </Link>
            
            {/* Mail Log Tab - Single Link */}
            <Link
              to="/dashboard/mail"
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                location.pathname.startsWith('/dashboard/mail')
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mail Log
            </Link>
            
            <Link
              to="/dashboard/contacts"
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                isActive('/dashboard/contacts')
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customers
            </Link>
            <Link
              to="/dashboard/templates"
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                location.pathname === '/dashboard/templates'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Email Templates
            </Link>
            <Link
              to="/dashboard/todos"
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                location.pathname === '/dashboard/todos'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tasks
            </Link>
            <Link
              to="/dashboard/scan"
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                location.pathname === '/dashboard/scan'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📱 Scan
            </Link>
            <Link
              to="/dashboard/settings"
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                location.pathname === '/dashboard/settings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Settings
            </Link>
            {/* Design tab temporarily hidden - route still exists at /dashboard/design-system */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
