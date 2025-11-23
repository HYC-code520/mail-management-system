import React, { useEffect, useState } from 'react';
import { Mail, Package, Bell, Search, ArrowUpDown, ArrowUp, ArrowDown, UserPlus } from 'lucide-react';
import { api } from '../lib/api-client.ts';

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
  recentMailItems: MailItem[];
  recentCustomers: Contact[];
  newCustomersToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting states
  const [sortColumn, setSortColumn] = useState<'date' | 'type' | 'customer' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [contacts, mailItems] = await Promise.all([
        api.contacts.getAll(),
        api.mailItems.getAll()
      ]);

      const today = new Date().toISOString().split('T')[0];
      
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
        recentMailItems: mailItems.slice(0, 6),
        recentCustomers: recentCustomers,
        newCustomersToday: newCustomersToday
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSort = (column: 'date' | 'type' | 'customer' | 'status') => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for date, ascending for others
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

  // Sorting
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
        <p className="text-gray-600">Mail activity overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Today's Mail */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Today's Mail</p>
              <p className="text-4xl font-bold text-brand">{stats?.todaysMail || 0}</p>
              <p className="text-gray-500 text-sm mt-1">items received</p>
            </div>
            <Mail className="w-8 h-8 text-brand" />
          </div>
        </div>

        {/* Pending Pickups */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Pending Pickups</p>
              <p className="text-4xl font-bold text-brand">{stats?.pendingPickups || 0}</p>
              <p className="text-gray-500 text-sm mt-1">awaiting collection</p>
            </div>
            <Package className="w-8 h-8 text-brand" />
          </div>
        </div>

        {/* Reminders Due */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Reminders Due</p>
              <p className="text-4xl font-bold text-brand">{stats?.remindersDue || 0}</p>
              <p className="text-gray-500 text-sm mt-1">need follow-up</p>
            </div>
            <Bell className="w-8 h-8 text-brand" />
          </div>
        </div>
      </div>

      {/* Recent Mail Activity */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Mail Activity</h2>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                <option>All Status</option>
                <option>Pending</option>
                <option>Notified</option>
                <option>Picked Up</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700 w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Date - Sortable */}
                <th 
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortColumn === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Type - Sortable */}
                <th 
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    {sortColumn === 'type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Quantity Column - Non-sortable */}
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Qty</th>
                
                {/* Customer - Sortable */}
                <th 
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('customer')}
                >
                  <div className="flex items-center gap-2">
                    Customer
                    {sortColumn === 'customer' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Status - Sortable */}
                <th 
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortColumn === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No mail items yet</p>
                  </td>
                </tr>
              ) : (
                sortedItems.map((item: MailItem) => (
                  <tr key={item.mail_item_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-gray-900">
                      {new Date(item.received_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-700">
                        {item.item_type === 'Package' ? (
                          <Package className="w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        <span>{item.item_type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-900 font-semibold">
                      {item.quantity || 1}
                    </td>
                    <td className="py-4 px-6 text-gray-900">
                      {item.contacts?.contact_person || item.contacts?.company_name || 'Unknown'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Pending' ? 'badge-pending' :
                        item.status === 'Notified' ? 'badge-notified' :
                        'badge-neutral'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Activity Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Customer Activity</h2>
              <p className="text-sm text-gray-600">Recent customer additions</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-green-600">{stats?.newCustomersToday || 0}</p>
            <p className="text-sm text-gray-500">added today</p>
          </div>
        </div>

        {/* Recent Customers List */}
        <div className="space-y-3">
          {stats?.recentCustomers && stats.recentCustomers.length > 0 ? (
            stats.recentCustomers.map((customer) => (
              <div
                key={customer.contact_id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {customer.contact_person || customer.company_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {customer.mailbox_number && `📮 ${customer.mailbox_number}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No recent customers</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
