import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Languages, Mail, AlertCircle, Menu, X, User, Settings, LayoutDashboard, Inbox, Users, FileText, CheckSquare, Camera, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      {/* Desktop: Top Bar with User & Language Dropdowns - Only on right side */}
      <div className={`hidden lg:block bg-gray-50 sticky top-0 z-50 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        <div className="px-6 py-3 flex justify-end items-center gap-3">
          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setLanguageMenuOpen(!languageMenuOpen);
                setUserMenuOpen(false);
              }}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-md"
              aria-label="Language menu"
            >
              <Languages className="w-5 h-5" />
            </button>

            {languageMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setLanguageMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      handleLanguageChange('EN');
                      setLanguageMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      currentLanguage === 'EN' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-2xl">🇬🇧</span>
                    <span className="font-medium">English</span>
                  </button>
                  <button
                    onClick={() => {
                      handleLanguageChange('CN');
                      setLanguageMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      currentLanguage === 'CN' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-2xl">🇨🇳</span>
                    <span className="font-medium">中文</span>
                  </button>
                  <button
                    onClick={() => {
                      handleLanguageChange('BOTH');
                      setLanguageMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      currentLanguage === 'BOTH' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Languages className="w-5 h-5 ml-0.5" />
                    <span className="font-medium">Both Languages</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setLanguageMenuOpen(false);
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white flex items-center justify-center transition-all shadow-md relative"
              aria-label="User menu"
            >
              <User className="w-5 h-5" />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </button>

            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white relative">
                        <User className="w-5 h-5" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <Settings className="w-5 h-5" />
                      <span className="font-medium">Settings</span>
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="px-4 py-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        void handleSignOut();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Top Bar */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 md:px-6">
          <div className="flex justify-between items-center py-3 md:py-4">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center">
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">Mei Way Mail</h1>
            </Link>

            {/* Mobile: Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Left Sidebar */}
      <div className={`hidden lg:flex lg:fixed lg:inset-y-0 lg:z-40 lg:flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-50 pb-4">
          {/* Logo and Text Section */}
          <div className="flex h-20 shrink-0 items-center justify-between pt-6 px-6">
            <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden min-w-0">
              <img 
                src="/assets/images/mei-way-logo.png" 
                alt="Mei Way Mail Logo" 
                className="w-12 h-12 rounded-full object-cover shadow-md hover:shadow-lg transition-shadow flex-shrink-0"
              />
              {!sidebarCollapsed && (
                <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">Mei Way Mail</h1>
              )}
            </Link>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0 ${sidebarCollapsed ? '' : 'ml-auto'}`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-700" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col px-3">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              <li>
            <Link
              to="/dashboard"
                  className={`group flex items-center py-3 text-sm font-medium leading-6 transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'pl-3 pr-3 gap-x-3'
                  } ${
                location.pathname === '/dashboard'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-r-full shadow-md -ml-3 pl-6'
                      : 'text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
                  title={sidebarCollapsed ? 'Dashboard' : ''}
            >
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">Dashboard</span>}
            </Link>
              </li>
            
              <li>
            <Link
              to="/dashboard/mail"
                  className={`group flex items-center py-3 text-sm font-medium leading-6 transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'pl-3 pr-3 gap-x-3'
                  } ${
                location.pathname.startsWith('/dashboard/mail')
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-r-full shadow-md -ml-3 pl-6'
                      : 'text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
                  title={sidebarCollapsed ? 'Mail Log' : ''}
            >
                  <Inbox className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">Mail Log</span>}
            </Link>
              </li>
            
              <li>
            <Link
              to="/dashboard/contacts"
                  className={`group flex items-center py-3 text-sm font-medium leading-6 transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'pl-3 pr-3 gap-x-3'
                  } ${
                isActive('/dashboard/contacts')
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-r-full shadow-md -ml-3 pl-6'
                      : 'text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
                  title={sidebarCollapsed ? 'Customers' : ''}
            >
                  <Users className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">Customers</span>}
            </Link>
              </li>

              <li>
                <Link
                  to="/dashboard/follow-ups"
                  className={`group flex items-center py-3 text-sm font-medium leading-6 transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'pl-3 pr-3 gap-x-3'
                  } ${
                    location.pathname === '/dashboard/follow-ups'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-r-full shadow-md -ml-3 pl-6'
                      : 'text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
                  title={sidebarCollapsed ? 'Follow-ups' : ''}
                >
                  <Bell className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">Follow-ups</span>}
            </Link>
              </li>

              <li>
            <Link
              to="/dashboard/todos"
                  className={`group flex items-center py-3 text-sm font-medium leading-6 transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'pl-3 pr-3 gap-x-3'
                  } ${
                location.pathname === '/dashboard/todos'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-r-full shadow-md -ml-3 pl-6'
                      : 'text-gray-700 hover:bg-gray-100 rounded-lg'
                  }`}
                  title={sidebarCollapsed ? 'To-Do' : ''}
                >
                  <CheckSquare className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">To-Do</span>}
                </Link>
              </li>

              <li>
            <Link
              to="/dashboard/templates"
                  className={`group flex items-center py-3 text-sm font-medium leading-6 transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'pl-3 pr-3 gap-x-3'
                  } ${
                location.pathname === '/dashboard/templates'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-r-full shadow-md -ml-3 pl-6'
                      : 'text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
                  title={sidebarCollapsed ? 'Email Templates' : ''}
            >
                  <FileText className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">Email Templates</span>}
            </Link>
              </li>

              <li>
            <Link
              to="/dashboard/scan"
                  className={`group flex items-center py-3 text-sm font-medium leading-6 transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'pl-3 pr-3 gap-x-3'
                  } ${
                location.pathname === '/dashboard/scan'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-r-full shadow-md -ml-3 pl-6'
                      : 'text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
                  title={sidebarCollapsed ? 'Scan' : ''}
            >
                  <Camera className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">Scan</span>}
            </Link>
              </li>
            </ul>

            {/* Gmail Status at Bottom */}
            <div className="mt-auto pb-4">
              {gmailConnected !== null && (
            <Link
              to="/dashboard/settings"
                  className={`flex items-center py-2 rounded-lg transition-all text-sm font-medium ${
                    sidebarCollapsed ? 'justify-center px-2' : 'px-3 gap-2'
                  } ${
                    gmailConnected
                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 animate-pulse'
              }`}
                  title={sidebarCollapsed ? (gmailConnected ? `Gmail: ${gmailAddress}` : 'Connect Gmail') : (gmailConnected ? `Gmail connected: ${gmailAddress}` : 'Gmail disconnected - Click to connect')}
                >
                  {gmailConnected ? (
                    <>
                      <Mail className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span className="whitespace-nowrap">Gmail Connected</span>}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span className="whitespace-nowrap">Connect Gmail</span>}
                    </>
                  )}
            </Link>
              )}
          </div>
          </nav>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute top-0 right-0 w-80 max-w-[85vw] h-full bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="pb-4 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900 break-words">{user?.email}</p>
                {gmailConnected !== null && (
                  <p className={`text-xs mt-1 ${gmailConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {gmailConnected ? '✓ Gmail Connected' : '✗ Gmail Not Connected'}
                  </p>
                )}
              </div>

              {/* Navigation Links */}
              <nav className="space-y-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === '/dashboard'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard/mail"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname.startsWith('/dashboard/mail')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Mail Log
                </Link>
                <Link
                  to="/dashboard/contacts"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive('/dashboard/contacts')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Customers
                </Link>
                <Link
                  to="/dashboard/templates"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === '/dashboard/templates'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Email Templates
                </Link>
                <Link
                  to="/dashboard/todos"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === '/dashboard/todos'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  To-Do
                </Link>
                <Link
                  to="/dashboard/scan"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === '/dashboard/scan'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Scan Mail
                </Link>
                <Link
                  to="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === '/dashboard/settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Settings
                </Link>
              </nav>

              {/* Sign Out Button */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleSignOut();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <Outlet />
      </main>
    </div>
  );
}
