import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Package, Bell, Search } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import { Button } from '../components/ui/button.tsx';

interface DashboardStats {
  todaysMail: number;
  pendingPickups: number;
  remindersDue: number;
  recentMailItems: any[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchTerm, setSearchTerm] = useState('');

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
      
      setStats({
        todaysMail: mailItems.filter((item: any) => 
          item.received_date?.startsWith(today)
        ).length,
        pendingPickups: mailItems.filter((item: any) => 
          item.status === 'Notified'
        ).length,
        remindersDue: mailItems.filter((item: any) => 
          item.status === 'Received'
        ).length,
        recentMailItems: mailItems.slice(0, 6)
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

  const filteredItems = stats?.recentMailItems.filter((item: any) => {
    const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      item.contacts?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contacts?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

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
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No mail items yet</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => (
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
    </div>
  );
}
