import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, UserPlus, FileText, Clock, AlertCircle, CheckCircle2, TrendingUp, ChevronDown, ChevronUp, AlertTriangle, MoreVertical, Send } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api-client.ts';
import Modal from '../components/Modal.tsx';
import QuickNotifyModal from '../components/QuickNotifyModal.tsx';
import ActionModal from '../components/ActionModal.tsx';
import SendEmailModal from '../components/SendEmailModal.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import toast from 'react-hot-toast';
import { getTodayNY, toNYDateString } from '../utils/timezone.ts';

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
  contacts?: {
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
  };
}

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
  status?: string;
  created_at?: string;
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
  needsFollowUp: MailItem[];
  mailVolumeData: Array<{ date: string; count: number }>;
  customerGrowthData: Array<{ date: string; customers: number }>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
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

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [contacts, mailItems] = await Promise.all([
        api.contacts.getAll(),
        api.mailItems.getAll()
      ]);

      // Get today's date in NY timezone
      const today = getTodayNY();
      const now = new Date();
      
      // Filter active customers (not archived)
      const activeContacts = contacts.filter((c: Contact) => c.status !== 'No');
      
      // Get customers added today (NY timezone)
      const newCustomersToday = activeContacts.filter((c: Contact) => {
        if (!c.created_at) return false;
        const createdDateNY = toNYDateString(c.created_at);
        return createdDateNY === today;
      }).length;
      
      // Get recent customers (last 5)
      const recentCustomers = activeContacts
        .sort((a: Contact, b: Contact) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        .slice(0, 5);
      
      // Calculate overdue mail (7+ days old from received_date, not picked up yet)
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const overdueMail = mailItems
        .filter((item: MailItem) => {
          // Only count mail that's still pending pickup (not completed statuses)
          if (item.status === 'Picked Up' || 
              item.status === 'Forward' || 
              item.status === 'Scanned Document' || 
              item.status === 'Scanned' || 
              item.status === 'Abandoned Package' ||
              item.status === 'Abandoned') {
            return false;
          }
          // Check if received_date is 7+ days old
          const receivedDate = new Date(item.received_date);
          return receivedDate < sevenDaysAgo;
        })
        .reduce((sum: number, item: MailItem) => sum + (item.quantity || 1), 0);

      // Calculate completed today (picked up today) - NY timezone
      const completedToday = mailItems
        .filter((item: MailItem) => {
          if (item.status === 'Picked Up' && item.pickup_date) {
            const pickupDateNY = toNYDateString(item.pickup_date);
            return pickupDateNY === today;
          }
          return false;
        })
        .reduce((sum: number, item: MailItem) => sum + (item.quantity || 1), 0);

      // Find mail that needs follow-up
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const needsFollowUp = mailItems.filter((item: MailItem) => {
        // Urgent: Notified for more than 2 days (use last_notified date, not received_date)
        if (item.status === 'Notified' && item.last_notified) {
          const notifiedDate = new Date(item.last_notified);
          return notifiedDate < twoDaysAgo;
        }
        // Action needed: Still in Received status
        if (item.status === 'Received') {
          return true;
        }
        return false;
      }).sort((a: MailItem, b: MailItem) => {
        // Sort by date - oldest first (most urgent)
        const dateA = a.last_notified || a.received_date;
        const dateB = b.last_notified || b.received_date;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      }); // Don't limit here - let the UI handle display count

      // Calculate mail volume based on selected time range (NY timezone)
      const mailVolumeData = getChartDateRange(chartTimeRange).map(({ dateStr, displayDate }) => {
        // Filter items for this specific date using NY timezone
        const count = mailItems
          .filter((item: MailItem) => {
            if (!item.received_date) return false;
            // Convert to NY date string for consistent comparison
            const itemDateNY = toNYDateString(item.received_date);
            return itemDateNY === dateStr;
          })
          .reduce((sum: number, item: MailItem) => sum + (item.quantity || 1), 0);
        
        return {
          date: displayDate,
          count
        };
      });

      // Calculate customer growth based on selected time range (NY timezone)
      const customerGrowthData = getChartDateRange(chartTimeRange).map(({ dateStr, displayDate }) => {
        // Count NEW customers added on THIS SPECIFIC DAY (NY timezone)
        const newCustomersOnDate = activeContacts.filter((c: Contact) => {
          if (!c.created_at) return false;
          const createdDateNY = toNYDateString(c.created_at);
          return createdDateNY === dateStr;
        }).length;
        
        return {
          date: displayDate,
          customers: newCustomersOnDate
        };
      });
      
      console.log('Customer Growth Data (new per day):', customerGrowthData);
      console.log('Data points:', customerGrowthData.length);
      console.log('Active Contacts:', activeContacts.length);
      
      setStats({
        todaysMail: mailItems
          .filter((item: MailItem) => {
            if (!item.received_date) return false;
            const receivedDateNY = toNYDateString(item.received_date);
            return receivedDateNY === today;
          })
          .reduce((sum: number, item: MailItem) => sum + (item.quantity || 1), 0),
        pendingPickups: mailItems
          .filter((item: MailItem) => 
            // All mail waiting to be picked up (in the shop)
            item.status === 'Received' || item.status === 'Notified' || item.status === 'Pending'
          )
          .reduce((sum: number, item: MailItem) => sum + (item.quantity || 1), 0),
        remindersDue: mailItems.filter((item: MailItem) => 
          item.status === 'Received'
        ).length,
        overdueMail,
        completedToday,
        recentMailItems: mailItems.slice(0, 6),
        recentCustomers,
        newCustomersToday,
        needsFollowUp,
        mailVolumeData,
        customerGrowthData
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [chartTimeRange]); // Dependency: reload when time range changes

  useEffect(() => {
    void loadDashboardData(); // Explicitly ignore the promise
  }, [loadDashboardData]); // Properly includes loadDashboardData

  // Helper function to get notification context based on notification history
  const getNotificationContext = (mailItem: MailItem) => {
    const count = mailItem.notification_count || 0;
    
    let buttonText: string;
    let suggestedTemplateType: string;
    let buttonColor: string;
    
    if (count === 0) {
      buttonText = "Send Notification";
      suggestedTemplateType = "Initial";
      buttonColor = "bg-blue-600/40 hover:bg-blue-600/60 text-blue-900 border border-blue-600/40"; // Border matches background
    } else if (count === 1) {
      buttonText = "Send Reminder";
      suggestedTemplateType = "Reminder";
      buttonColor = "bg-gray-600/40 hover:bg-gray-600/60 text-gray-900 border border-gray-300"; // 40% transparent gray
    } else {
      buttonText = "Send Final Notice";
      suggestedTemplateType = "Final Notice";
      buttonColor = "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"; // Muted amber (soft, not vibrant)
    }
    
    return { buttonText, suggestedTemplateType, buttonColor, count };
  };

  // Helper function to calculate days since a date (NY timezone aware)
  const getDaysSince = (dateStr: string) => {
    // Get today's date in NY timezone
    const todayNY = getTodayNY();
    const todayDate = new Date(todayNY + 'T00:00:00');
    
    // Convert the input date to NY timezone
    const itemDateNY = toNYDateString(dateStr);
    const itemDate = new Date(itemDateNY + 'T00:00:00');
    
    // Calculate difference in days
    const diffTime = todayDate.getTime() - itemDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays); // Return 0 for same day, prevent negative
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
      await api.mailItems.create({
        ...logMailFormData,
        quantity: logMailFormData.quantity || 1
      });
      toast.success('Mail logged successfully!');
      closeLogMailModal();
      loadDashboardData(); // Refresh dashboard data
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
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-green-600 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/dashboard/templates')}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            <FileText className="w-5 h-5" />
            <span>View Email Templates</span>
          </button>
          <button
            onClick={() => setIsAddCustomerModalOpen(true)}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Customer</span>
          </button>
          <button
            onClick={openLogMailModal}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            <Mail className="w-5 h-5" />
            <span>Log New Mail</span>
          </button>
        </div>
      </div>

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
        {/* Needs Follow-Up - Full width on mobile, 60% on desktop */}
        <div className="lg:col-span-3 h-full">
          {/* Needs Follow-Up Widget - HIGH PRIORITY */}
          {stats && stats.needsFollowUp.length > 0 && (
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg h-full">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                onClick={() => setIsFollowUpExpanded(!isFollowUpExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-gray-900" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">⚠️ Needs Follow-Up</h3>
                    <p className="text-sm text-gray-600">{stats.needsFollowUp.length} items require attention</p>
                  </div>
                </div>
                {isFollowUpExpanded ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
              </div>
          
          {isFollowUpExpanded && (
            <div className="p-4 pt-0 space-y-3">
              {stats.needsFollowUp.slice(0, followUpDisplayCount).map((item) => {
                // Calculate days since received (for "X days old" display and abandoned check)
                const daysSinceReceived = getDaysSince(item.received_date);
                
                // Calculate days since last action (for urgency check)
                const dateToUse = item.status === 'Notified' && item.last_notified 
                  ? item.last_notified 
                  : item.received_date;
                const daysSinceLastAction = getDaysSince(dateToUse);
                
                const isAbandoned = daysSinceReceived >= 30; // 30+ days since received
                const isUrgent = item.status === 'Notified' && daysSinceLastAction > 2; // 2+ days since last notification
                
                return (
                  <div
                    key={item.mail_item_id}
                    className={`flex items-center justify-between p-4 bg-white rounded-lg border-2 ${
                      isUrgent ? 'border-gray-400' : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        isAbandoned ? 'bg-red-600' : 
                        isUrgent ? 'bg-gray-900' : 'bg-gray-600'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.contacts?.contact_person || item.contacts?.company_name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-600">
                          📮 {item.contacts?.mailbox_number} • {item.item_type} • {daysSinceReceived} {daysSinceReceived === 1 ? 'day' : 'days'} old
                          {isAbandoned && (
                            <span className="font-semibold text-gray-900"> • ⚠️ ABANDONED</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Primary Action Button - Most Common/Urgent Action */}
                      {isAbandoned ? (
                        <button
                          onClick={() => {
                            setActionMailItem(item);
                            setActionModalType('abandoned');
                            setIsActionModalOpen(true);
                          }}
                          className="px-4 py-2 bg-red-200 hover:bg-red-300 text-gray-900 text-sm rounded-lg transition-colors flex items-center gap-2 relative group"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Mark as Abandoned
                          
                          {/* Tooltip for Abandoned */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-200 text-gray-900 text-[11px] text-left leading-relaxed shadow-lg border border-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75 whitespace-pre-line w-64 z-50 pointer-events-none">
                            {`📦 Received: ${formatDateForTooltip(item.received_date)} (${daysSinceReceived} days ago)\n⚠ Status: Abandoned (30+ days old)\n→ Action: Mark and archive this item`}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-200"></div>
                          </div>
                        </button>
                      ) : (
                        (() => {
                          const notificationCtx = getNotificationContext(item);
                          const tooltipText = getNotificationTooltip(item);
                          return (
                            <button
                              onClick={() => openSendEmailModal(item)}
                              className={`px-4 py-2 ${notificationCtx.buttonColor} text-sm rounded-lg transition-colors flex items-center gap-2 relative group`}
                            >
                              <Send className="w-4 h-4" />
                              {notificationCtx.buttonText}
                              
                              {/* Custom Tooltip - Sharp corners and darker gray */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-200 text-gray-900 text-[11px] text-left leading-relaxed shadow-lg border border-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75 whitespace-pre-line w-64 z-50 pointer-events-none">
                                {tooltipText}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-200"></div>
                              </div>
                            </button>
                          );
                        })()
                      )}
                      
                      {/* Three-Dots Dropdown for More Actions */}
                      <div className="relative">
                        <button
                          id={`followup-more-btn-${item.mail_item_id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFollowUpDropdownId(openFollowUpDropdownId === item.mail_item_id ? null : item.mail_item_id);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="More Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openFollowUpDropdownId === item.mail_item_id && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setOpenFollowUpDropdownId(null)}
                            ></div>
                            
                            {/* Dropdown content - using fixed positioning */}
                            <div 
                              className="fixed w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-40 max-h-96 overflow-y-auto"
                              style={{
                                top: `${(document.getElementById(`followup-more-btn-${item.mail_item_id}`)?.getBoundingClientRect().bottom ?? 0) + 4}px`,
                                right: `${window.innerWidth - (document.getElementById(`followup-more-btn-${item.mail_item_id}`)?.getBoundingClientRect().right ?? 0)}px`,
                              }}
                            >
                              {/* Send Email/Notification - Always visible */}
                              {(() => {
                                const notificationCtx = getNotificationContext(item);
                                const tooltipText = getNotificationTooltip(item);
                                return (
                                  <button
                                    onClick={() => {
                                      openSendEmailModal(item);
                                      setOpenFollowUpDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-3 relative group"
                                  >
                                    <Send className="w-4 h-4 text-blue-600" />
                                    {notificationCtx.buttonText}
                                    
                                    {/* Tooltip for dropdown - Sharp corners and darker gray */}
                                    <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-gray-200 text-gray-900 text-[11px] text-left leading-relaxed shadow-lg border border-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75 whitespace-pre-line w-64 z-50 pointer-events-none">
                                      {tooltipText}
                                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-200"></div>
                                    </div>
                                  </button>
                                );
                              })()}
                              
                              {/* Mark as Picked Up - For all statuses */}
                              <button
                                onClick={() => {
                                  setActionMailItem(item);
                                  setActionModalType('picked_up');
                                  setIsActionModalOpen(true);
                                  setOpenFollowUpDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 flex items-center gap-3 relative group"
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                Mark as Picked Up
                                
                                {/* Tooltip */}
                                <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-gray-200 text-gray-900 text-[11px] text-left leading-relaxed shadow-lg border border-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75 whitespace-pre-line w-56 z-50 pointer-events-none">
                                  {`✓ Mark this item as picked up\n→ Customer collected their mail`}
                                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-200"></div>
                                </div>
                              </button>
                              
                              {/* Mark as Scanned - Always visible */}
                              <button
                                onClick={() => {
                                  setActionMailItem(item);
                                  setActionModalType('scanned');
                                  setIsActionModalOpen(true);
                                  setOpenFollowUpDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-cyan-50 flex items-center gap-3 relative group"
                              >
                                <FileText className="w-4 h-4 text-cyan-600" />
                                Mark as Scanned
                                
                                {/* Tooltip */}
                                <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-gray-200 text-gray-900 text-[11px] text-left leading-relaxed shadow-lg border border-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75 whitespace-pre-line w-56 z-50 pointer-events-none">
                                  {`📄 Scan document and send\n→ For letters and documents`}
                                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-200"></div>
                                </div>
                              </button>
                              
                              {/* Forward - Always visible */}
                              <button
                                onClick={() => {
                                  setActionMailItem(item);
                                  setActionModalType('forward');
                                  setIsActionModalOpen(true);
                                  setOpenFollowUpDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-3 relative group"
                              >
                                <Send className="w-4 h-4 text-orange-600" />
                                Forward
                                
                                {/* Tooltip */}
                                <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-gray-200 text-gray-900 text-[11px] text-left leading-relaxed shadow-lg border border-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75 whitespace-pre-line w-56 z-50 pointer-events-none">
                                  {`→ Forward to another address\n✉️ Customer requested mail forwarding`}
                                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-200"></div>
                                </div>
                              </button>
                              
                              {/* Mark as Abandoned - Always visible */}
                              <button
                                onClick={() => {
                                  setActionMailItem(item);
                                  setActionModalType('abandoned');
                                  setIsActionModalOpen(true);
                                  setOpenFollowUpDropdownId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 flex items-center gap-3 relative group"
                              >
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                Mark as Abandoned
                                
                                {/* Tooltip */}
                                <div className="absolute left-full top-0 ml-2 px-3 py-2 bg-gray-200 text-gray-900 text-[11px] text-left leading-relaxed shadow-lg border border-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75 whitespace-pre-line w-56 z-50 pointer-events-none">
                                  {`⚠ Mark as abandoned package\n→ Customer not responding (30+ days)`}
                                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-200"></div>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Load More Button */}
              {stats.needsFollowUp.length > followUpDisplayCount && (
                <button
                  onClick={() => setFollowUpDisplayCount(prev => prev + 10)}
                  className="w-full py-3 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Load More ({stats.needsFollowUp.length - followUpDisplayCount} remaining)
                </button>
              )}
              
              {/* Show Less Button (if showing more than initial) */}
              {followUpDisplayCount > 10 && followUpDisplayCount >= stats.needsFollowUp.length && (
                <button
                  onClick={() => setFollowUpDisplayCount(10)}
                  className="w-full py-3 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
            </div>
          )}
        </div>

        {/* Charts - Full width on mobile, 40% on desktop */}
        <div className="lg:col-span-2 space-y-6 h-full">
          {/* Time Range Toggle - Shared for both charts */}
          <div className="flex items-center justify-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setChartTimeRange(7)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                chartTimeRange === 7
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setChartTimeRange(14)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                chartTimeRange === 14
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setChartTimeRange(30)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                chartTimeRange === 30
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Mail Volume Chart */}
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-sm h-[calc(50%-3rem)]">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-gray-900" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Mail Volume</h2>
                <p className="text-sm text-gray-600">Last {chartTimeRange} days</p>
              </div>
            </div>
            <div className="animate-fadeIn">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.mailVolumeData || []} key={`mail-volume-${chartTimeRange}`}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    interval={chartTimeRange === 30 ? 6 : chartTimeRange === 14 ? 2 : 1}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Customer Growth Chart */}
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-sm h-[calc(50%-3rem)]">
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className="w-6 h-6 text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Customers</h2>
                <p className="text-sm text-gray-600">Added per day (last {chartTimeRange} days)</p>
              </div>
            </div>
            <div className="animate-fadeIn">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats?.customerGrowthData || []} key={`customer-growth-${chartTimeRange}`}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    interval={chartTimeRange === 30 ? 6 : chartTimeRange === 14 ? 2 : 1}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="customers" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    isAnimationActive={false}
                    dot={{ fill: '#10B981', r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
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
      
      {/* Send Email Modal */}
      {emailingMailItem && (
        <SendEmailModal
          isOpen={isSendEmailModalOpen}
          onClose={() => {
            setIsSendEmailModalOpen(false);
            setEmailingMailItem(null);
          }}
          mailItem={emailingMailItem}
          onSuccess={handleEmailSuccess}
        />
      )}
    </div>
  );
}
