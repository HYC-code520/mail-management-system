import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Languages, Mail, AlertCircle, Menu, X, User, Settings, LayoutDashboard, Inbox, Users, FileText, CheckSquare, Camera, ChevronLeft, ChevronRight, Bell, DollarSign, Search, UserPlus, Zap, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import toast from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api-client.ts';
import Modal from '../Modal.tsx';
import LoadingSpinner from '../LoadingSpinner.tsx';
import { getTodayNY, toNYDateString } from '../../utils/timezone.ts';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
  status?: string;
  service_tier?: number;
}

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
  const [hasNewTodos, setHasNewTodos] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  // Quick Action Modal states
  const [isLogMailModalOpen, setIsLogMailModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Contacts for Log Mail dropdown
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Log Mail form data
  const [logMailFormData, setLogMailFormData] = useState<{
    contact_id: string;
    item_type: string;
    description: string;
    status: string;
    received_date: string;
    quantity: number | '';
  }>({
    contact_id: '',
    item_type: 'Letter',
    description: '',
    status: 'Received',
    received_date: toNYDateString(getTodayNY()),
    quantity: 1
  });

  // Add Customer form data (all fields matching NewContact page)
  const [customerFormData, setCustomerFormData] = useState({
    contact_person: '',
    company_name: '',
    mailbox_number: '',
    unit_number: '',
    email: '',
    phone_number: '',
    language_preference: 'English',
    service_tier: 1,
    status: 'Pending',
    display_name_preference: 'both'
  });

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

  // Check for new todos (incomplete tasks created in last 24 hours)
  const checkNewTodos = useCallback(async () => {
    try {
      const todos = await api.todos.getAll({ completed: false });
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const hasRecent = todos.some((todo: any) => {
        const createdAt = new Date(todo.created_at);
        return createdAt > oneDayAgo;
      });
      
      setHasNewTodos(hasRecent);
    } catch (error) {
      console.error('Error checking todos:', error);
      setHasNewTodos(false);
    }
  }, []);

  // Check Gmail connection status on mount only (not on every navigation)
  useEffect(() => {
    void checkGmailStatus();
    void checkNewTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Re-check todos when navigating TO the todos page (to clear the badge)
  useEffect(() => {
    if (location.pathname === '/dashboard/todos') {
      void checkNewTodos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Keyboard shortcut for quick actions (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickActionsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setQuickActionsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load contacts when Log Mail modal opens
  useEffect(() => {
    if (isLogMailModalOpen && contacts.length === 0 && !contactsLoading) {
      const loadContacts = async () => {
        setContactsLoading(true);
        try {
          const data = await api.contacts.getAll();
          const activeContacts = data.filter((c: Contact) => c.status === 'Active');
          setContacts(activeContacts);
        } catch (err) {
          console.error('Error loading contacts:', err);
          toast.error('Failed to load customers');
        } finally {
          setContactsLoading(false);
        }
      };
      void loadContacts();
    }
  }, [isLogMailModalOpen, contacts.length, contactsLoading]);

  // Format phone number as user types: 917-822-5751
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limitedDigits = digits.slice(0, 10);
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    } else if (limitedDigits.length <= 6) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    } else {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
  };

  // Close modal handlers
  const closeLogMailModal = () => {
    setIsLogMailModalOpen(false);
    setLogMailFormData({
      contact_id: '',
      item_type: 'Letter',
      description: '',
      status: 'Received',
      received_date: toNYDateString(getTodayNY()),
      quantity: 1
    });
  };

  const closeAddCustomerModal = () => {
    setIsAddCustomerModalOpen(false);
    setCustomerFormData({
      contact_person: '',
      company_name: '',
      mailbox_number: '',
      unit_number: '',
      email: '',
      phone_number: '',
      language_preference: 'English',
      service_tier: 1,
      status: 'Pending',
      display_name_preference: 'both'
    });
  };

  // Log Mail form handlers
  const handleLogMailFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'item_type' && (value === 'Package' || value === 'Large Package')) {
      const selectedContact = contacts.find(c => c.contact_id === logMailFormData.contact_id);
      if (selectedContact && selectedContact.service_tier === 1) {
        if (!window.confirm('Warning: This customer is on Service Tier 1, which typically does not include package handling. Are you sure you want to log a package for this customer?')) {
          return;
        }
      }
    }

    if (name === 'quantity') {
      const numValue = value === '' ? '' : parseInt(value, 10);
      if (value === '' || (!isNaN(numValue as number) && (numValue as number) >= 0)) {
        setLogMailFormData(prev => ({ ...prev, [name]: numValue }));
      }
    } else {
      setLogMailFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogMailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logMailFormData.contact_id) {
      toast.error('Please select a customer');
      return;
    }
    setSaving(true);
    try {
      const dateObj = new Date(logMailFormData.received_date + 'T12:00:00');
      const nyYear = dateObj.getFullYear();
      const nyMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const nyDay = String(dateObj.getDate()).padStart(2, '0');
      const receivedDateNY = `${nyYear}-${nyMonth}-${nyDay}T12:00:00-05:00`;

      const quantity = typeof logMailFormData.quantity === 'number' && logMailFormData.quantity > 0
        ? Math.floor(logMailFormData.quantity)
        : 1;

      await api.mailItems.create({
        ...logMailFormData,
        received_date: receivedDateNY,
        quantity
      });
      toast.success('Mail logged successfully!');
      closeLogMailModal();
    } catch (err) {
      console.error('Failed to log mail:', err);
      toast.error(`Failed to log mail: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Add Customer form handlers
  const handleCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'phone_number') {
      const formatted = formatPhoneNumber(value);
      setCustomerFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setCustomerFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.contact_person && !customerFormData.company_name) {
      toast.error('Please enter either a name or company name');
      return;
    }
    if (!customerFormData.mailbox_number) {
      toast.error('Mailbox number is required');
      return;
    }
    if (customerFormData.phone_number) {
      const digitsOnly = customerFormData.phone_number.replace(/\D/g, '');
      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
        toast.error('Phone number must be exactly 10 digits');
        return;
      }
    }
    setSaving(true);
    try {
      await api.contacts.create(customerFormData);
      toast.success('Customer added successfully!');
      closeAddCustomerModal();
      // Refresh contacts list for Log Mail modal
      setContacts([]);
    } catch (err) {
      console.error('Failed to create contact:', err);
      toast.error(`Failed to add customer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

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
      {/* Desktop: Top Bar with Search & User Dropdowns */}
      <div className={`hidden lg:block bg-gray-50 sticky top-0 z-50 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        <div className="py-3 flex justify-between items-center gap-3">
          {/* Quick Actions Search Bar */}
          <button
            onClick={() => setQuickActionsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex-1 ml-16 group"
          >
            <Zap className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            <span className="text-gray-500 text-base group-hover:text-gray-700 transition-colors">Quick action [CTRL + K]</span>
          </button>

          <div className="flex items-center gap-3 pr-16">
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
                  to="/dashboard/fees"
                  className={`group flex items-center py-3 text-sm font-medium leading-6 transition-all ${
                    sidebarCollapsed ? 'justify-center px-3' : 'pl-3 pr-3 gap-x-3'
                  } ${
                    location.pathname === '/dashboard/fees'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-r-full shadow-md -ml-3 pl-6'
                      : 'text-gray-700 hover:bg-gray-100 rounded-lg'
                  }`}
                  title={sidebarCollapsed ? 'Fees' : ''}
                >
                  <DollarSign className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">Fee Collection</span>}
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
                  {!sidebarCollapsed && (
                    <span className="flex items-center gap-3 whitespace-nowrap flex-1">
                      <span>To-Do</span>
                      {hasNewTodos && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                          New
                        </span>
                      )}
                    </span>
                  )}
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

              {/* Quick Actions Button for Mobile */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setQuickActionsOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors hover:bg-blue-100 mb-4"
              >
                <Search className="w-5 h-5" />
                <span>Quick Actions</span>
              </button>

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
                  to="/dashboard/fees"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === '/dashboard/fees'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Fee Collection
                </Link>
                <Link
                  to="/dashboard/todos"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === '/dashboard/todos'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>To-Do</span>
                  {hasNewTodos && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                      New
                    </span>
                  )}
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

      {/* Quick Actions Modal */}
      {quickActionsOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-20">
          <div 
            className="absolute inset-0" 
            onClick={() => setQuickActionsOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Quick Actions Grid */}
            <div className="p-6">
              <div className="mb-3 px-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quick Actions
                </h3>
              </div>
              <div className="space-y-1">
                {/* Scan Mail */}
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    navigate('/dashboard/scan');
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">Scan Mail</p>
                    <p className="text-sm text-gray-500">Start a new scan session</p>
                  </div>
                </button>

                {/* Log Mail */}
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    setIsLogMailModalOpen(true);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">Log Mail</p>
                    <p className="text-sm text-gray-500">Manually add mail items</p>
                  </div>
                </button>

                {/* Add Customer */}
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    setIsAddCustomerModalOpen(true);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">Add Customer</p>
                    <p className="text-sm text-gray-500">Create a new customer profile</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Mail Modal */}
      <Modal
        isOpen={isLogMailModalOpen}
        onClose={closeLogMailModal}
        title="Log New Mail"
      >
        <form onSubmit={handleLogMailSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              name="contact_id"
              value={logMailFormData.contact_id}
              onChange={handleLogMailFormChange}
              required
              disabled={contactsLoading}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-wait"
            >
              <option value="">{contactsLoading ? 'Loading customers...' : 'Select a customer'}</option>
              {contacts
                .sort((a, b) => (a.mailbox_number || '').localeCompare(b.mailbox_number || ''))
                .map(contact => (
                  <option key={contact.contact_id} value={contact.contact_id}>
                    {contact.mailbox_number} - {contact.contact_person || contact.company_name}
                  </option>
                ))
              }
            </select>
          </div>

          {/* Item Type & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Item Type <span className="text-red-500">*</span>
              </label>
              <select
                name="item_type"
                value={logMailFormData.item_type}
                onChange={handleLogMailFormChange}
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Letter">Letter</option>
                <option value="Package">Package</option>
                <option value="Large Package">Large Package</option>
                <option value="Certified Mail">Certified Mail</option>
              </select>
              {(logMailFormData.item_type === 'Package' || logMailFormData.item_type === 'Large Package') &&
               logMailFormData.contact_id &&
               contacts.find(c => c.contact_id === logMailFormData.contact_id)?.service_tier === 1 && (
                <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Tier 1 customers typically don't receive packages
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={logMailFormData.status}
                onChange={handleLogMailFormChange}
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Received">Received</option>
                <option value="Notified">Notified</option>
                <option value="Ready for Pickup">Ready for Pickup</option>
                <option value="Picked Up">Picked Up</option>
                <option value="Forward">Forward</option>
                <option value="Scanned">Scanned</option>
                <option value="Abandoned">Abandoned</option>
              </select>
            </div>
          </div>

          {/* Quantity & Received Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={logMailFormData.quantity}
                onChange={handleLogMailFormChange}
                min="1"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Received Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="received_date"
                value={logMailFormData.received_date}
                onChange={handleLogMailFormChange}
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={logMailFormData.description}
              onChange={handleLogMailFormChange}
              rows={3}
              placeholder="Add any notes about this mail item..."
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeLogMailModal}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Logging...</span>
                </>
              ) : (
                'Log Mail'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerModalOpen}
        onClose={closeAddCustomerModal}
        title="Add New Customer"
      >
        <form onSubmit={handleAddCustomerSubmit} className="space-y-6">
          {/* Name & Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contact_person"
                value={customerFormData.contact_person}
                onChange={handleCustomerFormChange}
                placeholder="Full name"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Company</label>
              <input
                type="text"
                name="company_name"
                value={customerFormData.company_name}
                onChange={handleCustomerFormChange}
                placeholder="Company name"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Mailbox & Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Mailbox # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="mailbox_number"
                value={customerFormData.mailbox_number}
                onChange={handleCustomerFormChange}
                placeholder="e.g., A1"
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Preferred Language</label>
              <select
                name="language_preference"
                value={customerFormData.language_preference}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="English">English</option>
                <option value="Chinese">Chinese</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={customerFormData.email}
                onChange={handleCustomerFormChange}
                placeholder="email@example.com"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Phone</label>
              <input
                type="tel"
                name="phone_number"
                value={customerFormData.phone_number}
                onChange={handleCustomerFormChange}
                placeholder="917-822-5751"
                maxLength={12}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Unit & Service Tier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Unit #</label>
              <input
                type="text"
                name="unit_number"
                value={customerFormData.unit_number}
                onChange={handleCustomerFormChange}
                placeholder="e.g., 101"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Service Tier</label>
              <select
                name="service_tier"
                value={customerFormData.service_tier}
                onChange={handleCustomerFormChange}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
          </div>

          {/* Customer Status */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Customer Status</label>
            <select
              name="status"
              value={customerFormData.status}
              onChange={handleCustomerFormChange}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="No">Archived</option>
            </select>
          </div>

          {/* Display Name Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Display Name Preference
              <span className="text-xs text-gray-500 ml-2 font-normal">How should this customer appear in lists?</span>
            </label>
            <select
              name="display_name_preference"
              value={customerFormData.display_name_preference}
              onChange={handleCustomerFormChange}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="both">Both (Company - Person)</option>
              <option value="company">Company Name Only</option>
              <option value="person">Person Name Only</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Shows both names, or whichever is available</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={closeAddCustomerModal}
              className="flex-1 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

