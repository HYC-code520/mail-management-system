import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, UserPlus, FileText, Clock, AlertCircle, CheckCircle2, TrendingUp, ChevronDown, ChevronUp, AlertTriangle, MoreVertical, Send } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api-client.ts';
import Modal from '../components/Modal.tsx';
import QuickNotifyModal from '../components/QuickNotifyModal.tsx';
import ActionModal from '../components/ActionModal.tsx';
import SendEmailModal from '../components/SendEmailModal.tsx';
import WaiveFeeModal from '../components/WaiveFeeModal.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import RevenueWidget from '../components/dashboard/RevenueWidget.tsx';
import GroupedFollowUpSection from '../components/dashboard/GroupedFollowUp.tsx';
import QuickActionsSection from '../components/dashboard/QuickActionsSection.tsx';
import ChartsSection from '../components/dashboard/ChartsSection.tsx';
import toast from 'react-hot-toast';
import { getTodayNY, toNYDateString, getNYTimestamp } from '../utils/timezone.ts';

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
  const [statusFilter] = useState('All Status');
  const [searchTerm] = useState('');
  const [isFollowUpExpanded, setIsFollowUpExpanded] = useState(true);
  const [followUpDisplayCount, setFollowUpDisplayCount] = useState(10); // Show 10 initially
  
  // Chart time range state
  const [chartTimeRange, setChartTimeRange] = useState<7 | 14 | 30>(7); // Default to 7 days
  
  // Sorting states (for future feature)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortColumn, setSortColumn] = useState<'date' | 'type' | 'customer' | 'status'>('date');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Add Customer Modal states
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isQuickNotifyModalOpen, setIsQuickNotifyModalOpen] = useState(false);
  const [notifyingMailItem, setNotifyingMailItem] = useState<MailItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [openFollowUpDropdownId, setOpenFollowUpDropdownId] = useState<string | null>(null);
  
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
  
  // Send Email Modal states
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [emailingMailItem, setEmailingMailItem] = useState<MailItem | null>(null);
  const [suggestedTemplateType, setSuggestedTemplateType] = useState<string | undefined>(undefined);
  
  // Waive Fee Modal states
  const [isWaiveFeeModalOpen, setIsWaiveFeeModalOpen] = useState(false);
  const [waivingGroup, setWaivingGroup] = useState<GroupedFollowUp | null>(null);
  
  // Action Modal states (for picked up, forward, abandoned actions)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState<'picked_up' | 'forward' | 'scanned' | 'abandoned'>('picked_up');
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

  // Helper function to get notification context based on notification history
  const getNotificationContext = (mailItem: MailItem) => {
    const count = mailItem.notification_count || 0;
    
    let buttonText: string;
    let suggestedTemplateType: string;
    let buttonColor: string;
    
    if (count === 0) {
      buttonText = "Send Notification";
      suggestedTemplateType = "Initial";
      buttonColor = "bg-blue-600/40 hover:bg-blue-600/60 text-blue-900 border border-blue-600/40";
    } else if (count === 1) {
      buttonText = "Send Reminder";
      suggestedTemplateType = "Reminder";
      buttonColor = "bg-gray-600/40 hover:bg-gray-600/60 text-gray-900 border border-gray-300";
    } else {
      buttonText = "Send Final Notice";
      suggestedTemplateType = "Final Notice";
      buttonColor = "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300";
    }
    
    return { buttonText, suggestedTemplateType, buttonColor, count };
  };

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

  // Helper function to format date for tooltip display (NY timezone)
  const formatDateForTooltip = (dateStr: string) => {
    const nyDateStr = toNYDateString(dateStr);
    const date = new Date(nyDateStr + 'T12:00:00'); // Use noon to avoid timezone edge cases
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Helper function to generate date range for charts
  const getChartDateRange = (days: number) => {
    const result = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Format as YYYY-MM-DD for data matching
      const dateStr = toNYDateString(date.toISOString());
      
      // Format for display (e.g., "Nov 20")
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      result.push({ dateStr, displayDate, date: displayDate }); // 'date' is what the chart uses
    }
    
    return result;
  };

  // Helper function to generate tooltip content for notification button
  const getNotificationTooltip = (mailItem: MailItem) => {
    const count = mailItem.notification_count || 0;
    const daysSinceReceived = getDaysSince(mailItem.received_date);
    const receivedDateFormatted = formatDateForTooltip(mailItem.received_date);
    
    let tooltip = `📦 Received: ${receivedDateFormatted} (${daysSinceReceived} ${daysSinceReceived === 1 ? 'day' : 'days'} ago)\n`;
    
    if (count === 0) {
      tooltip += `✉️ Status: Not notified yet\n`;
      tooltip += `→ Action: Send initial notification`;
    } else if (count === 1) {
      if (mailItem.last_notified) {
        const daysSinceNotified = getDaysSince(mailItem.last_notified);
        const lastNotifiedFormatted = formatDateForTooltip(mailItem.last_notified);
        tooltip += `✉️ Last notified: ${lastNotifiedFormatted} (${daysSinceNotified} ${daysSinceNotified === 1 ? 'day' : 'days'} ago)\n`;
      } else {
        tooltip += `✉️ Notified: 1 time\n`;
      }
      tooltip += `→ Action: Send reminder`;
    } else {
      if (mailItem.last_notified) {
        const daysSinceNotified = getDaysSince(mailItem.last_notified);
        const lastNotifiedFormatted = formatDateForTooltip(mailItem.last_notified);
        tooltip += `✉️ Last notified: ${lastNotifiedFormatted} (${daysSinceNotified} ${daysSinceNotified === 1 ? 'day' : 'days'} ago)\n`;
      }
      tooltip += `🔔 Notified: ${count} times\n`;
      tooltip += `⚠ Action: Send final notice`;
    }
    
    return tooltip;
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

  // const openQuickNotifyModal = (item: MailItem) => {
  //   setNotifyingMailItem(item);
  //   setIsQuickNotifyModalOpen(true);
  // };

  const openSendEmailModal = (item: MailItem) => {
    setEmailingMailItem(item);
    setIsSendEmailModalOpen(true);
  };

  const handleEmailSuccess = () => {
    loadDashboardData(); // Refresh data after email sent
    setIsSendEmailModalOpen(false);
    setEmailingMailItem(null);
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

  const openWaiveFeeModal = (group: GroupedFollowUp) => {
    setWaivingGroup(group);
    setIsWaiveFeeModalOpen(true);
  };

  const handleWaiveFeeSuccess = () => {
    loadDashboardData(); // Refresh data after waiving fees
    setIsWaiveFeeModalOpen(false);
    setWaivingGroup(null);
  };

  const openSendEmailForGroup = (group: GroupedFollowUp) => {
    // For grouped follow-up, we need to handle sending email to the contact
    // We'll use the first mail item as the reference
    const firstItem = group.packages[0] || group.letters[0];
    if (firstItem) {
      // Calculate suggested template based on urgency
      const allItems = [...group.packages, ...group.letters];
      const oldestDays = Math.max(...allItems.map(item => getDaysSince(item.received_date)));
      
      let suggested: string | undefined;
      if (oldestDays >= 28) {
        suggested = 'Final Notice Before Abandonment';
      } else if (group.totalFees > 0) {
        suggested = 'Package Fee Reminder';
      } else {
        suggested = 'General Reminder';
      }
      
      setSuggestedTemplateType(suggested);
      openSendEmailModal(firstItem);
    }
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

  // const handleSort = (column: 'date' | 'type' | 'customer' | 'status') => {
  //   if (sortColumn === column) {
  //     setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortColumn(column);
  //     setSortDirection(column === 'date' ? 'desc' : 'asc');
  //   }
  // };

  const filteredItems = stats?.recentMailItems.filter((item: any) => {
    const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      item.contacts?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contacts?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'date':
        comparison = new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
        break;
      case 'type':
        comparison = a.item_type.localeCompare(b.item_type);
        break;
      case 'customer': {
        const nameA = a.contacts?.contact_person || a.contacts?.company_name || '';
        const nameB = b.contacts?.contact_person || b.contacts?.company_name || '';
        comparison = nameA.localeCompare(nameB);
        break;
      }
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Today's mail activity, metrics, and customer insights</p>
      </div>

      {/* Quick Action Buttons */}
      <QuickActionsSection
        onViewTemplates={() => navigate('/dashboard/templates')}
        onAddCustomer={() => setIsAddCustomerModalOpen(true)}
        onLogMail={openLogMailModal}
      />

      {/* Stats Cards - Responsive grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {/* Today's Mail */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Today's Mail</p>
              <p className="text-4xl font-bold text-gray-900">{stats?.todaysMail || 0}</p>
              <p className="text-gray-500 text-sm mt-1">items received</p>
            </div>
            <Mail className="w-8 h-8 text-gray-900" />
          </div>
        </div>

        {/* Pending Pickups */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Pending Pickups</p>
              <p className="text-4xl font-bold text-gray-900">{stats?.pendingPickups || 0}</p>
              <p className="text-gray-500 text-sm mt-1">awaiting collection</p>
            </div>
            <Package className="w-8 h-8 text-gray-900" />
          </div>
        </div>

        {/* Overdue! */}
        <div className="bg-white border-2 border-red-200 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-900 text-sm mb-1 font-semibold">Overdue!</p>
              <p className="text-4xl font-bold text-red-600">{stats?.overdueMail || 0}</p>
              <p className="text-gray-900 text-sm mt-1">&gt;7 days old</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Completed Today</p>
              <p className="text-4xl font-bold text-green-600">{stats?.completedToday || 0}</p>
              <p className="text-gray-500 text-sm mt-1">picked up</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Responsive Layout: Stack on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 items-start">
        {/* Revenue Widget - NEW */}
        <div className="lg:col-span-5">
          <RevenueWidget
            monthlyRevenue={stats?.monthlyRevenue || 0}
            outstandingFees={stats?.outstandingFees || 0}
            totalRevenue={stats?.totalRevenue || 0}
            loading={loading}
          />
        </div>

        {/* Needs Follow-Up - Full width on mobile, 60% on desktop */}
        <div className="lg:col-span-3 h-full">
          <GroupedFollowUpSection
            groups={stats?.needsFollowUp || []}
            onWaiveFee={openWaiveFeeModal}
            onSendEmail={openSendEmailForGroup}
            getDaysSince={getDaysSince}
            loading={loading}
          />
        </div>

        {/* Charts - Full width on mobile, 40% on desktop */}
        <ChartsSection
          mailVolumeData={stats?.mailVolumeData || []}
          customerGrowthData={stats?.customerGrowthData || []}
          chartTimeRange={chartTimeRange}
          onTimeRangeChange={setChartTimeRange}
          loading={chartsLoading}
        />
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
      
      {/* Waive Fee Modal */}
      {waivingGroup && (
        <WaiveFeeModal
          isOpen={isWaiveFeeModalOpen}
          onClose={() => {
            setIsWaiveFeeModalOpen(false);
            setWaivingGroup(null);
          }}
          group={waivingGroup}
          onSuccess={handleWaiveFeeSuccess}
        />
      )}
      
      {/* Send Email Modal */}
      {emailingMailItem && (
        <SendEmailModal
          isOpen={isSendEmailModalOpen}
          onClose={() => {
            setIsSendEmailModalOpen(false);
            setEmailingMailItem(null);
            setSuggestedTemplateType(undefined);
          }}
          mailItem={emailingMailItem}
          onSuccess={handleEmailSuccess}
          suggestedTemplateType={suggestedTemplateType}
        />
      )}
    </div>
  );
}
