import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api-client.ts';

interface DashboardStats {
  totalContacts: number;
  activeMailItems: number;
  pendingFollowUps: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Fetch contacts and mail items counts
      const [contacts, mailItems] = await Promise.all([
        api.contacts.getAll(),
        api.mailItems.getAll()
      ]);

      setStats({
        totalContacts: contacts.length || 0,
        activeMailItems: mailItems.filter((item: any) => item.status !== 'Picked Up').length || 0,
        pendingFollowUps: 0, // We can implement this later
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Set default stats on error
      setStats({
        totalContacts: 0,
        activeMailItems: 0,
        pendingFollowUps: 0,
      });
    } finally {
      setLoading(false);
    }
  };

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
          <Link
            to="/dashboard/mail-items/new"
            className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
          >
            + Add Mail Item
          </Link>
          <Link
            to="/dashboard/contacts/new"
            className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
          >
            + Add Contact
          </Link>
        </div>
      </div>

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

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Welcome to Mei Way Outreach Tracker
        </h2>
        <p className="text-zinc-300 text-lg mb-6">
          Your centralized hub for managing mail center communications
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/dashboard/contacts"
            className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
          >
            View Contacts
          </Link>
          <Link
            to="/dashboard/mail-items"
            className="bg-zinc-800 text-white px-8 py-3 rounded-lg font-semibold border border-zinc-700 hover:bg-zinc-700 transition-colors"
          >
            View Mail Items
          </Link>
        </div>
      </div>
    </div>
  );
}

