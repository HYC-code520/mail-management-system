'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function MailItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mailItems, setMailItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    loadMailItems();
  }, []);

  const loadMailItems = async () => {
    try {
      const response = await fetch('/api/mail-items');
      if (response.ok) {
        const data = await response.json();
        // Handle both { mailItems: [...] } and [...] formats
        const items = data.mailItems || data;
        setMailItems(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      console.error('Error loading mail items:', err);
      setMailItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = mailItems.filter(item => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Active') return item.status === 'Received' || item.status === 'Notified';
    if (filterStatus === 'follow-up') {
      const hoursSince = (Date.now() - new Date(item.received_date).getTime()) / (1000 * 60 * 60);
      return item.status === 'Notified' && hoursSince > 24;
    }
    return item.status === filterStatus;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      Received: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      Notified: 'bg-green-500/20 text-green-400 border-green-500/30',
      'Picked Up': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      Returned: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {status}
      </span>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-700 rounded w-48"></div>
          <div className="h-64 bg-zinc-900 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Mail Items</h1>
          <p className="text-zinc-400 mt-1">All packages and mail received</p>
        </div>
        <Button variant="slim" onClick={() => router.push('/dashboard/mail-items/new')}>
          + Add Mail Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
        >
          <option value="All">All Items ({mailItems.length})</option>
          <option value="Active">Active ({mailItems.filter(i => i.status === 'Received' || i.status === 'Notified').length})</option>
          <option value="Received">Received</option>
          <option value="Notified">Notified</option>
          <option value="Picked Up">Picked Up</option>
          <option value="Returned">Returned</option>
          <option value="follow-up">Needs Follow-up</option>
        </select>
      </div>

      {/* Mail Items List */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        {filteredItems.length > 0 ? (
          <div className="divide-y divide-zinc-700">
            {filteredItems.map(item => (
              <div 
                key={item.mail_item_id}
                className="p-6 hover:bg-zinc-800 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {item.contacts?.contact_person || item.contacts?.company_name || 'Unknown Contact'}
                      </h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        📦 {item.item_type}
                      </span>
                      {item.contacts?.unit_number && (
                        <span className="flex items-center gap-1">
                          🏢 Unit {item.contacts.unit_number}
                        </span>
                      )}
                      {item.contacts?.mailbox_number && (
                        <span className="flex items-center gap-1">
                          📮 Mailbox {item.contacts.mailbox_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500 mb-1">{getTimeAgo(item.received_date)}</p>
                    <p className="text-xs text-zinc-600">{formatDate(item.received_date)}</p>
                  </div>
                </div>
                
                {item.description && (
                  <p className="text-sm text-zinc-300 mb-3">{item.description}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/dashboard/contacts/${item.contact_id}`)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View Contact
                  </button>
                  {item.status === 'Received' && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <button
                        onClick={() => alert('Send notification feature coming soon!')}
                        className="text-sm text-green-400 hover:text-green-300"
                      >
                        Notify Customer
                      </button>
                    </>
                  )}
                  {(item.status === 'Received' || item.status === 'Notified') && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <button
                        onClick={() => alert('Mark as picked up feature coming soon!')}
                        className="text-sm text-gray-400 hover:text-gray-300"
                      >
                        Mark Picked Up
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {filterStatus === 'All' ? 'No mail items yet' : 'No items match this filter'}
            </h3>
            <p className="text-zinc-400 mb-6">
              {filterStatus === 'All' 
                ? 'Get started by logging your first package or mail'
                : 'Try selecting a different filter to see more items'
              }
            </p>
            {filterStatus === 'All' && (
              <Button variant="slim" onClick={() => router.push('/dashboard/mail-items/new')}>
                + Add Mail Item
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {filteredItems.length > 0 && (
        <div className="mt-4 text-sm text-zinc-500">
          Showing {filteredItems.length} of {mailItems.length} mail items
        </div>
      )}
    </div>
  );
}

