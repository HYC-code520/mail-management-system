import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, Bell, Search, ArrowUpDown, ArrowUp, ArrowDown, UserPlus, Plus, FileText, Clock, AlertCircle, CheckCircle2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../lib/api-client.ts';
import Modal from '../components/Modal.tsx';
import QuickNotifyModal from '../components/QuickNotifyModal.tsx';
import toast from 'react-hot-toast';

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  contact_id: string;
  quantity?: number;
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
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFollowUpExpanded, setIsFollowUpExpanded] = useState(true);
  
  // Sorting states
  const [sortColumn, setSortColumn] = useState<'date' | 'type' | 'customer' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Add Customer Modal states
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isQuickNotifyModalOpen, setIsQuickNotifyModalOpen] = useState(false);
  const [notifyingMailItem, setNotifyingMailItem] = useState<MailItem | null>(null);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  const loadDashboardData = async () => {
    try {
      const [contacts, mailItems] = await Promise.all([
        api.contacts.getAll(),
        api.mailItems.getAll()
      ]);

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // Filter active customers (not archived)
      const activeContacts = contacts.filter((c: Contact) => c.status !== 'No');
      
      // Get customers added today
      const newCustomersToday = activeContacts.filter((c: Contact) => 
        c.created_at?.startsWith(today)
      ).length;
      
      // Get recent customers (last 5)
      const recentCustomers = activeContacts
        .sort((a: Contact, b: Contact) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        .slice(0, 5);
      
      // Calculate overdue mail (Notified for more than 7 days)
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const overdueMail = mailItems.filter((item: MailItem) => {
        if (item.status === 'Notified') {
          const receivedDate = new Date(item.received_date);
          return receivedDate < sevenDaysAgo;
        }
        return false;
      }).length;

      // Calculate completed today
      const completedToday = mailItems.filter((item: MailItem) => 
        item.status === 'Picked Up' && item.received_date?.startsWith(today)
      ).length;

      // Find mail that needs follow-up
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const needsFollowUp = mailItems.filter((item: MailItem) => {
        // Urgent: Notified for more than 2 days
        if (item.status === 'Notified') {
          const receivedDate = new Date(item.received_date);
          return receivedDate < twoDaysAgo;
        }
        // Action needed: Still in Received status
        if (item.status === 'Received') {
          return true;
        }
        return false;
      }).slice(0, 10); // Limit to 10 items

      // Calculate 7-day mail volume
      const mailVolumeData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = mailItems.filter((item: MailItem) => 
          item.received_date?.startsWith(dateStr)
        ).length;
        mailVolumeData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count
        });
      }

      // Calculate 30-day customer growth
      // Customer Growth Chart Data - Show NEW customers added per day (last 14 days)
      const customerGrowthData = [];
      
      if (activeContacts.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Always show last 14 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 13); // 13 days ago + today = 14 days
        startDate.setHours(0, 0, 0, 0);
        
        // Generate one point per day for 14 days
        for (let i = 0; i <= 13; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Count NEW customers added on THIS SPECIFIC DAY
          const newCustomersOnDate = activeContacts.filter((c: Contact) => {
            if (!c.created_at) return false;
            const createdDate = c.created_at.split('T')[0];
            return createdDate === dateStr; // Exact match for this day only
          }).length;
          
          customerGrowthData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            customers: newCustomersOnDate
          });
        }
      }
      
      console.log('Customer Growth Data (new per day):', customerGrowthData);
      console.log('Data points:', customerGrowthData.length);
      console.log('Active Contacts:', activeContacts.length);
      
      setStats({
        todaysMail: mailItems.filter((item: MailItem) => 
          item.received_date?.startsWith(today)
        ).length,
        pendingPickups: mailItems.filter((item: MailItem) => 
          item.status === 'Notified'
        ).length,
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
  };

  const getDaysSince = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const openQuickNotifyModal = (item: MailItem) => {
    setNotifyingMailItem(item);
    setIsQuickNotifyModalOpen(true);
  };

  const handleQuickNotifySuccess = () => {
    loadDashboardData();
    setIsQuickNotifyModalOpen(false);
    setNotifyingMailItem(null);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSort = (column: 'date' | 'type' | 'customer' | 'status') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };

  const filteredItems = stats?.recentMailItems.filter((item: any) => {
    const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      item.contacts?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contacts?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'date':
        comparison = new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
        break;
      case 'type':
        comparison = a.item_type.localeCompare(b.item_type);
        break;
      case 'customer':
        const nameA = a.contacts?.contact_person || a.contacts?.company_name || '';
        const nameB = b.contacts?.contact_person || b.contacts?.company_name || '';
        comparison = nameA.localeCompare(nameB);
        break;
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
        <p className="text-gray-600">Mail activity overview and quick actions</p>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard/templates')}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <FileText className="w-5 h-5" />
          <span>View Templates</span>
        </button>
        <button
          onClick={() => setIsAddCustomerModalOpen(true)}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Customer</span>
        </button>
        <button
          onClick={() => navigate('/dashboard/mail')}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <Mail className="w-5 h-5" />
          <span>Log New Mail</span>
        </button>
      </div>

      {/* Stats Cards - 4 columns */}
      <div className="grid grid-cols-4 gap-6 mb-8">
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
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1 font-semibold">Overdue!</p>
              <p className="text-4xl font-bold text-gray-900">{stats?.overdueMail || 0}</p>
              <p className="text-gray-500 text-sm mt-1">&gt;7 days notified</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-900" />
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

      {/* Needs Follow-Up Widget - HIGH PRIORITY */}
      {stats && stats.needsFollowUp.length > 0 && (
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg mb-8">
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
              {stats.needsFollowUp.map((item) => {
                const daysSince = getDaysSince(item.received_date);
                const isUrgent = item.status === 'Notified' && daysSince > 2;
                
                return (
                  <div
                    key={item.mail_item_id}
                    className={`flex items-center justify-between p-4 bg-white rounded-lg border-2 ${
                      isUrgent ? 'border-gray-400' : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${isUrgent ? 'bg-gray-900' : 'bg-gray-600'}`}></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.contacts?.contact_person || item.contacts?.company_name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-gray-600">
                          📮 {item.contacts?.mailbox_number} • {item.item_type}
                          {isUrgent ? ` • Notified ${daysSince} days ago` : ' • Not yet notified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUrgent && (
                        <span className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded">
                          Urgent!
                        </span>
                      )}
                      {item.status === 'Received' ? (
                        <button
                          onClick={() => openQuickNotifyModal(item)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 text-sm rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Bell className="w-4 h-4" />
                          Mark as Notified
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate('/dashboard/mail')}
                          className="px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm rounded-lg transition-colors"
                        >
                          View in Mail Log
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Mail Volume Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-gray-900" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mail Volume</h2>
              <p className="text-sm text-gray-600">Last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.mailVolumeData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickLine={{ stroke: '#E5E7EB' }}
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
              <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Growth Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">New Customers</h2>
              <p className="text-sm text-gray-600">Added per day (last 14 days)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats?.customerGrowthData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickLine={{ stroke: '#E5E7EB' }}
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
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
                <option value={3}>Tier 3 - Premium</option>
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
    </div>
  );
}
