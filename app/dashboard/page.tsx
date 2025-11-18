'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Link from 'next/link';

interface DashboardStats {
  totalContacts: number;
  activeMailItems: number;
  pendingFollowUps: number;
  recentMailItems: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states for recent mail items
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  };

  const getUrgencyLevel = (item: any) => {
    const now = new Date();
    const received = new Date(item.received_date);
    const diffHours = (now.getTime() - received.getTime()) / (1000 * 60 * 60);
    
    if (item.status === 'Picked Up') return 'none';
    if (item.item_type === 'Certified Mail' && diffHours > 24) return 'high';
    if (diffHours > 72) return 'high';
    if (diffHours > 48) return 'medium';
    return 'low';
  };

  const getFilteredMailItems = () => {
    if (!stats?.recentMailItems) return [];
    
    return stats.recentMailItems.filter(item => {
      // Status filter
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      
      // Item type filter
      if (itemTypeFilter !== 'All' && item.item_type !== itemTypeFilter) return false;
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const contactName = (item.contact?.contact_person || item.contact?.company_name || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const unitNumber = (item.contact?.unit_number || '').toLowerCase();
        
        if (!contactName.includes(search) && !description.includes(search) && !unitNumber.includes(search)) {
          return false;
        }
      }
      
      return true;
    });
  };

  const filteredItems = getFilteredMailItems();
  
  // Get unique item types for filter dropdown
  const itemTypes = stats?.recentMailItems 
    ? Array.from(new Set(stats.recentMailItems.map((item: any) => item.item_type)))
    : [];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-zinc-700 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-zinc-900 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-4">
          <Button variant="slim" onClick={() => router.push('/dashboard/mail-items/new')}>
            + Add Mail Item
          </Button>
          <Button variant="slim" onClick={() => router.push('/dashboard/contacts/new')}>
            + Add Contact
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-8">
          <h3 className="text-red-400 font-bold mb-2">✕ Error</h3>
          <p className="text-zinc-300">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm mb-1">Total Contacts</p>
              <p className="text-4xl font-bold text-white">
                {stats?.totalContacts || 0}
              </p>
            </div>
            <div className="text-4xl">📇</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm mb-1">Active Mail Items</p>
              <p className="text-4xl font-bold text-white">
                {stats?.activeMailItems || 0}
              </p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm mb-1">Pending Follow-ups</p>
              <p className="text-4xl font-bold text-white">
                {stats?.pendingFollowUps || 0}
              </p>
            </div>
            <div className="text-4xl">⏰</div>
          </div>
        </div>
      </div>

      {/* Recent Mail Items */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Recent Mail Items</h2>
          <Link href="/dashboard/mail-items">
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              View All →
            </button>
          </Link>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, unit, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Received">📥 Received</option>
            <option value="Notified">📧 Notified</option>
            <option value="Picked Up">✅ Picked Up</option>
          </select>
          
          {/* Item Type Filter */}
          <select
            value={itemTypeFilter}
            onChange={(e) => setItemTypeFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Types</option>
            {itemTypes.map((type: any) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Active Filters Indicator */}
        {(statusFilter !== 'All' || itemTypeFilter !== 'All' || searchTerm) && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-zinc-400">Active filters:</span>
            {statusFilter !== 'All' && (
              <button
                onClick={() => setStatusFilter('All')}
                className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs hover:bg-blue-500/30 transition-colors"
              >
                Status: {statusFilter} ✕
              </button>
            )}
            {itemTypeFilter !== 'All' && (
              <button
                onClick={() => setItemTypeFilter('All')}
                className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs hover:bg-blue-500/30 transition-colors"
              >
                Type: {itemTypeFilter} ✕
              </button>
            )}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs hover:bg-blue-500/30 transition-colors"
              >
                Search: "{searchTerm}" ✕
              </button>
            )}
            <button
              onClick={() => {
                setStatusFilter('All');
                setItemTypeFilter('All');
                setSearchTerm('');
              }}
              className="text-zinc-500 hover:text-zinc-300 text-xs underline"
            >
              Clear all
            </button>
          </div>
        )}
        
        {filteredItems.length > 0 ? (
          <>
            {/* Results count */}
            <div className="text-sm text-zinc-500 mb-3">
              Showing {filteredItems.length} of {stats?.recentMailItems.length || 0} items
            </div>
            
            <div className="space-y-2">
              {filteredItems.slice(0, 10).map((item: any) => {
                const urgency = getUrgencyLevel(item);
                return (
                  <div 
                    key={item.mail_item_id} 
                    className="flex items-center gap-4 p-4 border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/contacts/${item.contact?.contact_id}`)}
                  >
                    {/* Urgency Indicator */}
                    {urgency === 'high' && (
                      <div className="w-1 h-12 bg-red-500 rounded-full" title="Urgent - needs attention"></div>
                    )}
                    {urgency === 'medium' && (
                      <div className="w-1 h-12 bg-yellow-500 rounded-full" title="Follow up soon"></div>
                    )}
                    {urgency === 'low' && (
                      <div className="w-1 h-12 bg-green-500 rounded-full" title="Recent"></div>
                    )}
                    
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white truncate">
                          {item.contact?.contact_person || item.contact?.company_name || 'Unknown Contact'}
                        </p>
                        {item.contact?.unit_number && (
                          <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 shrink-0">
                            Unit {item.contact.unit_number}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <span>{item.item_type}</span>
                        {item.description && (
                          <>
                            <span>•</span>
                            <span className="truncate">{item.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Status & Time */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm text-zinc-500 mb-1">
                          {getTimeAgo(item.received_date)}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          item.status === 'Received' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          item.status === 'Notified' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          item.status === 'Picked Up' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/contacts/${item.contact?.contact_id}/message`);
                          }}
                          className="p-2 hover:bg-zinc-700 rounded transition-colors"
                          title="Send message"
                        >
                          📧
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/contacts/${item.contact?.contact_id}`);
                          }}
                          className="p-2 hover:bg-zinc-700 rounded transition-colors"
                          title="View contact"
                        >
                          👤
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredItems.length > 10 && (
              <div className="text-center mt-4">
                <Link href="/dashboard/mail-items">
                  <Button variant="slim">
                    View All {filteredItems.length} Items →
                  </Button>
                </Link>
              </div>
            )}
          </>
        ) : searchTerm || statusFilter !== 'All' || itemTypeFilter !== 'All' ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No matches found</h3>
            <p className="text-zinc-400 mb-6">
              Try adjusting your filters or search term
            </p>
            <Button 
              variant="flat" 
              onClick={() => {
                setStatusFilter('All');
                setItemTypeFilter('All');
                setSearchTerm('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">No mail items yet</h3>
            <p className="text-zinc-400 mb-6">
              Get started by logging your first package
            </p>
            <Button variant="slim" onClick={() => router.push('/dashboard/mail-items/new')}>
              + Add Mail Item
            </Button>
          </div>
        )}
      </div>

      {/* Follow-ups Needed */}
      {stats && stats.pendingFollowUps > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-4">⚠️ Follow-ups Needed</h2>
          <p className="text-zinc-300 mb-4">
            You have {stats.pendingFollowUps} mail item(s) that need follow-up.
          </p>
          <Link href="/dashboard/mail-items?filter=follow-up">
            <Button variant="slim">View Follow-ups</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

