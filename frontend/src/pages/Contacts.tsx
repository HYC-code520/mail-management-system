import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client.ts';
import { toast } from 'react-hot-toast';

interface Contact {
  contact_id: string;
  company_name: string | null;
  unit_number: string | null;
  contact_person: string | null;
  email: string | null;
  phone_number: string | null;
  service_tier: number | null;
  mailbox_number: string | null;
  status: string;
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await api.contacts.getAll();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading contacts:', err);
      toast.error('Error loading contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      (contact.company_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (contact.contact_person?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (contact.unit_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (contact.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'All' || contact.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      Active: 'bg-green-500/20 text-green-400 border-green-500/30',
      PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      No: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-700 rounded w-48"></div>
          <div className="h-64 bg-zinc-900 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Contacts</h1>
        <button
          onClick={() => navigate('/dashboard/contacts/new')}
          className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
        >
          + New Contact
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
        >
          <option>All</option>
          <option>Active</option>
          <option>PENDING</option>
          <option>No</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-700">
            <thead className="bg-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Service Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Mailbox #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <tr key={contact.contact_id} className="hover:bg-zinc-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {contact.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                      {contact.unit_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                      {contact.contact_person || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                      {contact.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                      {contact.phone_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-zinc-300">
                      {contact.service_tier || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                      {contact.mailbox_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={contact.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button 
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={() => navigate(`/dashboard/contacts/${contact.contact_id}`)}
                      >
                        View
                      </button>
                      <button 
                        className="text-green-400 hover:text-green-300 transition-colors"
                        onClick={() => navigate(`/dashboard/contacts/${contact.contact_id}/message`)}
                      >
                        Message
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📭</div>
                      <h3 className="text-xl font-semibold text-white mb-2">No contacts found</h3>
                      <p className="text-zinc-400 mb-6">
                        {searchTerm || filterStatus !== 'All' 
                          ? 'Try adjusting your search or filter'
                          : 'Get started by adding your first contact'
                        }
                      </p>
                      {!searchTerm && filterStatus === 'All' && (
                        <button
                          onClick={() => navigate('/dashboard/contacts/new')}
                          className="bg-white text-black px-6 py-2 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
                        >
                          + Add Contact
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      <div className="mt-4 text-sm text-zinc-500">
        Showing {filteredContacts.length} of {contacts.length} contacts
      </div>
    </div>
  );
}

