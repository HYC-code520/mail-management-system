import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, AlertCircle, CheckCircle2, AlertTriangle, Clock, Users } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import Modal from '../components/Modal.tsx';
import QuickNotifyModal from '../components/QuickNotifyModal.tsx';
import ActionModal from '../components/ActionModal.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import RevenueWidget from '../components/dashboard/RevenueWidget.tsx';
// QuickActionsSection removed - using inline implementation
import ChartsSection from '../components/dashboard/ChartsSection.tsx';
import AnalyticsSection from '../components/dashboard/AnalyticsSection.tsx';
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

interface AnalyticsData {
  avgResponseTime: number;
  responseTimeBreakdown: {
    emailCustomers: number;
    walkInCustomers: number;
    totalPickups: number;
  };
  activeCustomers: number;
  inactiveCustomers: number;
  serviceTiers: { tier1: number; tier2: number };
  languageDistribution: { English: number; Chinese: number; Both: number };
  statusDistribution: { [key: string]: number };
  paymentDistribution: { Cash: number; Zelle: number; Venmo: number; PayPal: number; Check: number; Other: number };
  ageDistribution: { '0-3': number; '4-7': number; '8-14': number; '15-30': number; '30+': number };
  staffPerformance: { Merlin: number; Madison: number };
  comparison: {
    thisMonth: { mail: number; customers: number };
    lastMonth: { mail: number; customers: number };
  };
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
  // NEW: Analytics data
  analytics?: AnalyticsData;
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
  const [contacts] = useState<Contact[]>([]);
  
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
    
    // Handle quantity field - allow empty for typing, parse as integer
    if (name === 'quantity') {
      // Allow empty string while typing, or parse as positive integer
      const numValue = value === '' ? '' : parseInt(value, 10);
      // Only set if it's empty or a valid positive number
      if (value === '' || (!isNaN(numValue as number) && (numValue as number) >= 0)) {
        setLogMailFormData(prev => ({
          ...prev,
          [name]: numValue
        }));
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
      // Convert the date string (YYYY-MM-DD) to NY timezone timestamp
      // Add noon time to avoid timezone edge cases
      const dateObj = new Date(logMailFormData.received_date + 'T12:00:00');
      const nyYear = dateObj.getFullYear();
      const nyMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const nyDay = String(dateObj.getDate()).padStart(2, '0');
      const receivedDateNY = `${nyYear}-${nyMonth}-${nyDay}T12:00:00-05:00`; // NY timezone offset
      
      // Ensure quantity is a valid positive integer (default to 1)
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
      <div className="max-w-full mx-auto px-16 py-6">
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
    <div className="max-w-full mx-auto px-16 py-6">
      {/* Top Row: Merlin (1/4) | Madison (1/4) | Today's Overview (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6" style={{ overflow: 'visible' }}>
        {stats?.analytics && (
          <>
            {/* Merlin Performance - 1/4 width */}
            <div className="lg:col-span-1" style={{ overflow: 'visible' }}>
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow relative" style={{ minHeight: '160px', overflow: 'visible' }}>
                {/* Avatar positioned on the RIGHT side - smaller and further right */}
                <div className="absolute bottom-0 right-0 pointer-events-none" style={{ 
                  height: '170px',
                  width: 'auto',
                  right: '-60px',
                  bottom: '0',
                  zIndex: 20
                }}>
                  <img 
                    src="/assets/images/Merlin.png" 
                    alt="Merlin" 
                    className="h-full w-auto object-contain object-bottom"
                    style={{ 
                      filter: 'drop-shadow(4px 4px 12px rgba(0,0,0,0.25))'
                    }}
                  />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-xs">MR</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-gray-900">Merlin</h3>
                      <p className="text-xs text-gray-500">This Week</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-blue-600">{stats.analytics.staffPerformance.Merlin}</p>
                    <p className="text-xs text-gray-600">tasks completed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Madison Performance - 1/4 width */}
            <div className="lg:col-span-1" style={{ overflow: 'visible' }}>
              <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow relative" style={{ minHeight: '160px', overflow: 'visible' }}>
                {/* Avatar positioned on the RIGHT side - smaller and further right */}
                <div className="absolute bottom-0 right-0 pointer-events-none" style={{ 
                  height: '170px',
                  width: 'auto',
                  right: '-60px',
                  bottom: '0',
                  zIndex: 20
                }}>
                  <img 
                    src="/assets/images/Madison.png" 
                    alt="Madison" 
                    className="h-full w-auto object-contain object-bottom"
                    style={{ 
                      filter: 'drop-shadow(4px 4px 12px rgba(0,0,0,0.25))'
                    }}
                  />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-xs">MP</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-gray-900">Madison</h3>
                      <p className="text-xs text-gray-500">This Week</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-purple-600">{stats.analytics.staffPerformance.Madison}</p>
                    <p className="text-xs text-gray-600">tasks completed</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Today's Overview - 1/2 width (single horizontal line) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 h-full flex flex-col justify-center">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Today's Overview</h2>
            
            <div className="flex items-center justify-between gap-4">
              {/* Today's Mail */}
              <div className="flex items-center gap-2 flex-1">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 whitespace-nowrap">Today's Mail</p>
                  <p className="text-xl font-bold text-gray-900">{stats?.todaysMail || 0}</p>
                </div>
              </div>

              {/* Pending Pickups */}
              <div className="flex items-center gap-2 flex-1">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 whitespace-nowrap">Pending Pickups</p>
                  <p className="text-xl font-bold text-gray-900">{stats?.pendingPickups || 0}</p>
                </div>
              </div>

              {/* Overdue */}
              <div className="flex items-center gap-2 flex-1">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 whitespace-nowrap">Overdue</p>
                  <p className="text-xl font-bold text-red-600">{stats?.overdueMail || 0}</p>
                </div>
              </div>

              {/* Completed Today */}
              <div className="flex items-center gap-2 flex-1">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 whitespace-nowrap">Completed Today</p>
                  <p className="text-xl font-bold text-green-600">{stats?.completedToday || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Charts (left 1/2) + Revenue Widget (right 1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Charts Section */}
        <div className="lg:col-span-1">
          <ChartsSection
            mailVolumeData={stats?.mailVolumeData || []}
            customerGrowthData={stats?.customerGrowthData || []}
            chartTimeRange={chartTimeRange}
            onTimeRangeChange={setChartTimeRange}
            loading={chartsLoading}
          />
        </div>

        {/* Right: Revenue Widget */}
        <div className="lg:col-span-1">
          <RevenueWidget
            monthlyRevenue={stats?.monthlyRevenue || 0}
            outstandingFees={stats?.outstandingFees || 0}
            totalRevenue={stats?.totalRevenue || 0}
            loading={loading}
          />
        </div>
      </div>

      {/* Analytics Section */}
      {stats?.analytics && (
        <div className="mt-8 mb-6">
          <AnalyticsSection
            analytics={stats.analytics}
            loading={loading}
          />
        </div>
      )}

      {/* Metric Cards, Mail Age Distribution, and Needs Follow-up - Same Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Two Metric Cards Stacked Vertically - 1/5 width, each takes 1/2 height */}
        {stats?.analytics && (
          <div className="lg:col-span-1 flex flex-col gap-4 h-full">
            {/* This Month Mail - takes 1/2 of container height */}
            <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-4 border border-green-100 shadow-md hover:shadow-lg transition-shadow flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-green-700 font-semibold uppercase">This Month Mail</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">{stats.analytics.comparison.thisMonth.mail}</p>
                  {(() => {
                    const mailChange = stats.analytics.comparison.lastMonth.mail > 0
                      ? ((stats.analytics.comparison.thisMonth.mail - stats.analytics.comparison.lastMonth.mail) / stats.analytics.comparison.lastMonth.mail) * 100
                      : 0;
                    return mailChange !== 0 && (
                      <span className={`flex items-center text-sm font-bold ${mailChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mailChange > 0 ? '↑' : '↓'}
                        {Math.abs(mailChange).toFixed(0)}%
                      </span>
                    );
                  })()}
                </div>
                {/* Mini Sparkline Trend - BIGGER */}
                {(() => {
                  const lastMonth = stats.analytics.comparison.lastMonth.mail;
                  const thisMonth = stats.analytics.comparison.thisMonth.mail;
                  const maxValue = Math.max(lastMonth, thisMonth, 1);
                  const lastMonthHeight = (lastMonth / maxValue) * 100;
                  const thisMonthHeight = (thisMonth / maxValue) * 100;
                  
                  return (
                    <div className="flex items-end gap-1.5 h-16">
                      <div 
                        className="w-4 bg-green-300 rounded-t transition-all duration-300"
                        style={{ height: `${lastMonthHeight}%` }}
                      />
                      <div 
                        className="w-4 bg-green-500 rounded-t transition-all duration-300"
                        style={{ height: `${thisMonthHeight}%` }}
                      />
                    </div>
                  );
                })()}
              </div>
              <p className="text-xs text-gray-500 mt-1">vs {stats.analytics.comparison.lastMonth.mail} last month</p>
            </div>

            {/* New Customers - takes 1/2 of container height */}
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-xl p-4 border border-orange-100 shadow-md hover:shadow-lg transition-shadow flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-orange-700 font-semibold uppercase">New Customers</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-gray-900">{stats.analytics.comparison.thisMonth.customers}</p>
                  {(() => {
                    const customerChange = stats.analytics.comparison.lastMonth.customers > 0
                      ? ((stats.analytics.comparison.thisMonth.customers - stats.analytics.comparison.lastMonth.customers) / stats.analytics.comparison.lastMonth.customers) * 100
                      : 0;
                    return customerChange !== 0 && (
                      <span className={`flex items-center text-sm font-bold ${customerChange > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                        {customerChange > 0 ? '↑' : '↓'}
                        {Math.abs(customerChange).toFixed(0)}%
                      </span>
                    );
                  })()}
                </div>
                {/* Mini Sparkline Trend - BIGGER */}
                {(() => {
                  const lastMonth = stats.analytics.comparison.lastMonth.customers;
                  const thisMonth = stats.analytics.comparison.thisMonth.customers;
                  const maxValue = Math.max(lastMonth, thisMonth, 1);
                  const lastMonthHeight = (lastMonth / maxValue) * 100;
                  const thisMonthHeight = (thisMonth / maxValue) * 100;
                  
                  return (
                    <div className="flex items-end gap-1.5 h-16">
                      <div 
                        className="w-4 bg-orange-300 rounded-t transition-all duration-300"
                        style={{ height: `${lastMonthHeight}%` }}
                      />
                      <div 
                        className="w-4 bg-orange-500 rounded-t transition-all duration-300"
                        style={{ height: `${thisMonthHeight}%` }}
                      />
                    </div>
                  );
                })()}
              </div>
              <p className="text-xs text-gray-500 mt-1">vs {stats.analytics.comparison.lastMonth.customers} last month</p>
            </div>
          </div>
        )}

        {/* Mail Age Distribution - 2/5 width */}
        {stats?.analytics?.ageDistribution && (
          <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-lg border border-gray-100 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Mail Age Distribution</h3>
                <p className="text-xs text-gray-500">Current pending items by age</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-2">
              {[
                { name: '0-3 days', value: stats.analytics.ageDistribution['0-3'], color: '#10B981' },
                { name: '4-7 days', value: stats.analytics.ageDistribution['4-7'], color: '#FCD34D' },
                { name: '8-14 days', value: stats.analytics.ageDistribution['8-14'], color: '#F59E0B' },
                { name: '15-30 days', value: stats.analytics.ageDistribution['15-30'], color: '#EF4444' },
                { name: '30+ days', value: stats.analytics.ageDistribution['30+'], color: '#A855F7' }
              ].map((item) => {
                const total = Object.values(stats.analytics?.ageDistribution || {}).reduce((sum, v) => sum + v, 0);
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-20 text-xs font-semibold text-gray-700 whitespace-nowrap">{item.name}</div>
                    <div className="flex-1">
                      <div className="h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full flex items-center justify-end px-2 transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: item.color,
                            minWidth: item.value > 0 ? '50px' : '0'
                          }}
                        >
                          {item.value > 0 && (
                            <span className="text-xs font-bold text-white">{item.value}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-xs font-semibold text-gray-600">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Needs Follow-up Section - 2/5 width */}
        {stats?.needsFollowUp && stats.needsFollowUp.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-4 h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Needs Follow-up</h2>
                  <p className="text-xs text-gray-500">{stats.needsFollowUp.length} {stats.needsFollowUp.length === 1 ? 'customer' : 'customers'} need attention</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/dashboard/follow-ups')}
                className="px-2 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-semibold whitespace-nowrap ml-2"
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {stats.needsFollowUp.slice(0, 4).map((group) => (
                <div key={group.contact.contact_id} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-2.5 border border-orange-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-xs truncate">{group.contact.contact_person || group.contact.company_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-600">Box #{group.contact.mailbox_number}</p>
                    </div>
                    {group.totalFees > 0 && (
                      <span className="text-orange-700 font-bold text-sm ml-2 flex-shrink-0">${group.totalFees}</span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-gray-700">
                    {group.packages.length > 0 && <span className="flex items-center gap-1">📦 <span className="font-semibold">{group.packages.length}</span></span>}
                    {group.letters.length > 0 && <span className="flex items-center gap-1">✉️ <span className="font-semibold">{group.letters.length}</span></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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

