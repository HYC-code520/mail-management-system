import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import Modal from '../components/Modal.tsx';
import QuickNotifyModal from '../components/QuickNotifyModal.tsx';
import ActionModal from '../components/ActionModal.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import RevenueWidget from '../components/dashboard/RevenueWidget.tsx';
import QuickActionsSection from '../components/dashboard/QuickActionsSection.tsx';
import ChartsSection from '../components/dashboard/ChartsSection.tsx';
import toast from 'react-hot-toast';
import { getTodayNY, toNYDateString } from '../utils/timezone.ts';

interface PackageFee {
  fee_id: string;
  mail_item_id: string;
  fee_amount: number;
  days_charged: number;
  fee_status: 'pending' | 'paid' | 'waived';
  paid_date?: string;
  waived_date?: string;
  waive_reason?: string;
}

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  pickup_date?: string;
  contact_id: string;
  quantity?: number;
  last_notified?: string;
  notification_count?: number; // How many times customer has been notified
  packageFee?: PackageFee; // NEW: Fee data for packages
  contacts?: {
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
  };
}

interface GroupedFollowUp {
  contact: {
    contact_id: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
  };
  packages: MailItem[];
  letters: MailItem[];
  totalFees: number;
  urgencyScore: number;
  lastNotified?: string;
}

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
  status?: string;
  created_at?: string;
  service_tier?: number;
}

interface DashboardStats {
  todaysMail: number;
  pendingPickups: number;
  remindersDue: number;
  overdueMail: number;
  completedToday: number;
  recentMailItems: MailItem[];
  recentCustomers: Contact[];
  newCustomersToday: number;
  needsFollowUp: GroupedFollowUp[]; // CHANGED: Now grouped by person
  mailVolumeData: Array<{ date: string; count: number }>;
  customerGrowthData: Array<{ date: string; customers: number }>;
  // NEW: Package fee revenue data
  outstandingFees: number;
  totalRevenue: number;
  monthlyRevenue: number;
  waivedFees?: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false); // Separate loading state for charts
  
  // Chart time range state
  const [chartTimeRange, setChartTimeRange] = useState<7 | 14 | 30>(7); // Default to 7 days

  // Add Customer Modal states
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isQuickNotifyModalOpen, setIsQuickNotifyModalOpen] = useState(false);
  const [notifyingMailItem, setNotifyingMailItem] = useState<MailItem | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Log New Mail Modal states
  const [isLogMailModalOpen, setIsLogMailModalOpen] = useState(false);
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // Action Modal states (for picked up, forward, abandoned actions)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionModalType] = useState<'picked_up' | 'forward' | 'scanned' | 'abandoned'>('picked_up');
  const [actionMailItem, setActionMailItem] = useState<MailItem | null>(null);
  
  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    mailbox_number: '',
    unit_number: '',
    email: '',
    phone_number: '',
    language_preference: 'English',
    service_tier: 1,
    status: 'Pending'
  });

  const loadDashboardData = useCallback(async (isInitialLoad = true) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setChartsLoading(true);
      }
      const statsData = await api.stats.getDashboardStats(chartTimeRange);
      
      if (isInitialLoad) {
        // Full update on initial load
        setStats(statsData);
      } else {
        // Only update chart data when switching time ranges
        setStats(prevStats => prevStats ? {
          ...prevStats,
          mailVolumeData: statsData.mailVolumeData,
          customerGrowthData: statsData.customerGrowthData
        } : statsData);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      toast.error('Failed to load dashboard data.');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setChartsLoading(false);
      }
    }
  }, [chartTimeRange]);

  // Initial load on mount
  useEffect(() => {
    void loadDashboardData(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update only charts when time range changes
  useEffect(() => {
    if (stats) { // Only run if we already have data (skip initial load)
      void loadDashboardData(false);
    }
  }, [chartTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper function to calculate days since a date (NY timezone aware)
  const getDaysSince = (dateStr: string) => {
    const todayNY = getTodayNY();
    const todayDate = new Date(todayNY + 'T00:00:00');
    const itemDateNY = toNYDateString(dateStr);
    const itemDate = new Date(itemDateNY + 'T00:00:00');
    const diffTime = todayDate.getTime() - itemDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Format phone number as user types: 917-822-5751
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    // Format: XXX-XXX-XXXX
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    } else if (limitedDigits.length <= 6) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    } else {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Apply phone formatting if the field is 'phone_number'
    if (name === 'phone_number') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const closeAddCustomerModal = () => {
    setIsAddCustomerModalOpen(false);
    setFormData({
      contact_person: '',
      company_name: '',
      mailbox_number: '',
      unit_number: '',
      email: '',
      phone_number: '',
      language_preference: 'English',
      service_tier: 1,
      status: 'Pending'
    });
  };

  const openLogMailModal = async () => {
    setIsLogMailModalOpen(true);
    // Load contacts for the dropdown
    try {
      const contactsData = await api.contacts.getAll();
      setContacts(contactsData);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      toast.error('Failed to load customers');
    }
  };

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

  const handleLogMailFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Check if selecting Package for Tier 1 customer
    if (name === 'item_type' && (value === 'Package' || value === 'Large Package')) {
      const selectedContact = contacts.find(c => c.contact_id === logMailFormData.contact_id);
      if (selectedContact && selectedContact.service_tier === 1) {
        if (!window.confirm('⚠️ Warning: This customer is on Service Tier 1, which typically does not include package handling. Are you sure you want to log a package for this customer?')) {
          return; // Don't change if user cancels
        }
      }
    }
    
    setLogMailFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogMailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!logMailFormData.contact_id) {
      toast.error('Please select a customer');
      return;
    }

    setSaving(true);

    try {
      // Convert the date string (YYYY-MM-DD) to NY timezone timestamp
      // Add noon time to avoid timezone edge cases
      const dateObj = new Date(logMailFormData.received_date + 'T12:00:00');
      const nyYear = dateObj.getFullYear();
      const nyMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const nyDay = String(dateObj.getDate()).padStart(2, '0');
      const receivedDateNY = `${nyYear}-${nyMonth}-${nyDay}T12:00:00-05:00`; // NY timezone offset
      
      await api.mailItems.create({
        ...logMailFormData,
        received_date: receivedDateNY,
        quantity: logMailFormData.quantity || 1
      });
      toast.success('Mail logged successfully!');
      closeLogMailModal();
      await loadDashboardData(); // Refresh dashboard data
    } catch (err) {
      console.error('Failed to log mail:', err);
      toast.error(`Failed to log mail: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contact_person && !formData.company_name) {
      toast.error('Please enter either a name or company name');
      return;
    }

    if (!formData.mailbox_number) {
      toast.error('Mailbox number is required');
      return;
    }

    // Validate phone number if provided
    if (formData.phone_number) {
      const digitsOnly = formData.phone_number.replace(/\D/g, '');
      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
        toast.error('Phone number must be exactly 10 digits');
        return;
      }
    }

    setSaving(true);

    try {
      await api.contacts.create(formData);
      toast.success('Customer added successfully!');
      closeAddCustomerModal();
      loadDashboardData(); // Refresh dashboard data
    } catch (err) {
      console.error('Failed to create contact:', err);
      toast.error(`Failed to add customer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleActionSuccess = () => {
    loadDashboardData();
    setIsActionModalOpen(false);
    setActionMailItem(null);
  };

  const handleQuickNotifySuccess = () => {
    loadDashboardData();
    setIsQuickNotifyModalOpen(false);
    setNotifyingMailItem(null);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Loading spinner with message */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner 
            message="Loading dashboard data..." 
            size="lg"
          />
        </div>
        
        {/* Optional: Keep skeleton underneath for better UX */}
        <div className="animate-pulse space-y-8 opacity-50 mt-8">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-100 rounded-lg"></div>
            <div className="h-64 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Quick Action Buttons */}
      <QuickActionsSection
        onScanMail={() => navigate('/dashboard/scan')}
        onAddCustomer={() => setIsAddCustomerModalOpen(true)}
        onLogMail={openLogMailModal}
        followUpCount={stats?.needsFollowUp?.length || 0}
        onNavigateToFollowUps={() => navigate('/dashboard/follow-ups')}
      />

      {/* Stats Cards - Responsive grid with modern design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {/* Today's Mail */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 shadow-md border border-blue-100 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <p className="text-blue-700 text-xs font-semibold uppercase tracking-wide mb-2">Today's Mail</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats?.todaysMail || 0}</p>
              <p className="text-gray-600 text-sm">items received</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
              <Mail className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Pending Pickups */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-6 shadow-md border border-purple-100 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <p className="text-purple-700 text-xs font-semibold uppercase tracking-wide mb-2">Pending Pickups</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">{stats?.pendingPickups || 0}</p>
              <p className="text-gray-600 text-sm">awaiting collection</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Overdue! */}
        <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-6 shadow-md border border-red-200 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <p className="text-red-700 text-xs font-semibold uppercase tracking-wide mb-2">Overdue!</p>
              <p className="text-4xl font-bold text-red-600 mb-1">{stats?.overdueMail || 0}</p>
              <p className="text-gray-700 text-sm font-medium">&gt;7 days old</p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-md animate-pulse">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 shadow-md border border-green-100 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <p className="text-green-700 text-xs font-semibold uppercase tracking-wide mb-2">Completed Today</p>
              <p className="text-4xl font-bold text-green-600 mb-1">{stats?.completedToday || 0}</p>
              <p className="text-gray-600 text-sm">picked up</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Widget */}
      <div className="mb-8">
        <RevenueWidget
          monthlyRevenue={stats?.monthlyRevenue || 0}
          outstandingFees={stats?.outstandingFees || 0}
          totalRevenue={stats?.totalRevenue || 0}
          loading={loading}
        />
      </div>

      {/* Charts - Full width */}
      <ChartsSection
        mailVolumeData={stats?.mailVolumeData || []}
        customerGrowthData={stats?.customerGrowthData || []}
        chartTimeRange={chartTimeRange}
        onTimeRangeChange={setChartTimeRange}
        loading={chartsLoading}
      />

      {/* Add Customer Modal */}
      <Modal 
        isOpen={isAddCustomerModalOpen} 
        onClose={closeAddCustomerModal}
        title="Add New Customer"
      >
        <form onSubmit={handleAddCustomerSubmit} className="space-y-6">
          {/* Name & Company */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleFormChange}
                placeholder="Full name"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Company</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleFormChange}
                placeholder="Company name"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Mailbox & Language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Mailbox # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="mailbox_number"
                value={formData.mailbox_number}
                onChange={handleFormChange}
                placeholder="e.g., A1"
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Preferred Language</label>
              <select
                name="language_preference"
                value={formData.language_preference}
                onChange={handleFormChange}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="English">English</option>
                <option value="Chinese">Chinese</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="email@example.com"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Phone</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleFormChange}
                placeholder="917-822-5751"
                maxLength={12}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Unit & Service Tier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Unit #</label>
              <input
                type="text"
                name="unit_number"
                value={formData.unit_number}
                onChange={handleFormChange}
                placeholder="e.g., 101"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Service Tier</label>
              <select
                name="service_tier"
                value={formData.service_tier}
                onChange={handleFormChange}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={1}>Tier 1 - Basic</option>
                <option value={2}>Tier 2 - Standard</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={closeAddCustomerModal}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log New Mail Modal */}
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
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a customer</option>
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

      {/* Quick Notify Modal */}
      {notifyingMailItem && (
        <QuickNotifyModal
          isOpen={isQuickNotifyModalOpen}
          onClose={() => {
            setIsQuickNotifyModalOpen(false);
            setNotifyingMailItem(null);
          }}
          mailItemId={notifyingMailItem.mail_item_id}
          contactId={notifyingMailItem.contact_id}
          customerName={notifyingMailItem.contacts?.contact_person || notifyingMailItem.contacts?.company_name || 'Customer'}
          onSuccess={handleQuickNotifySuccess}
        />
      )}
      
      {/* Action Modal for status changes (Picked Up, Forward, Scanned, Abandoned) */}
      {actionMailItem && (
        <ActionModal
          isOpen={isActionModalOpen}
          onClose={() => {
            setIsActionModalOpen(false);
            setActionMailItem(null);
          }}
          mailItemId={actionMailItem.mail_item_id}
          mailItemDetails={{
            customerName: actionMailItem.contacts?.contact_person || actionMailItem.contacts?.company_name || 'Customer',
            itemType: actionMailItem.item_type,
            currentStatus: actionMailItem.status
          }}
          actionType={actionModalType}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
