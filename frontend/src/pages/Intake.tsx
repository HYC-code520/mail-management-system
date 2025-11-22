import React, { useState, useEffect } from 'react';
import { Search, Save, Bell, Mail, Package } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  unit_number?: string;
  mailbox_number?: string;
  status?: string;
}

interface TodaysEntry {
  mail_item_id: string;
  item_type: string;
  contacts: Contact;
  status: string;
  description?: string;
  received_date: string;
}

interface IntakePageProps {
  embedded?: boolean;
}

export default function IntakePage({ embedded = false }: IntakePageProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [itemType, setItemType] = useState('Letter');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [todaysEntries, setTodaysEntries] = useState<TodaysEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTodaysEntries();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchContacts();
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery]);

  const searchContacts = async () => {
    try {
      const contacts = await api.contacts.getAll();
      const filtered = contacts.filter((c: Contact) => {
        // Exclude archived customers (status: 'No')
        const isActive = c.status !== 'No';
        
        // Match search query
        const matchesQuery = 
          c.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.mailbox_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.unit_number?.toLowerCase().includes(searchQuery.toLowerCase());
        
        return isActive && matchesQuery;
      });
      setSearchResults(filtered.slice(0, 8));
      setShowDropdown(true);
    } catch (err) {
      console.error('Error searching contacts:', err);
    }
  };

  const loadTodaysEntries = async () => {
    try {
      const mailItems = await api.mailItems.getAll();
      const today = new Date().toISOString().split('T')[0];
      const todaysItems = mailItems.filter((item: any) => 
        item.received_date?.startsWith(today)
      );
      setTodaysEntries(todaysItems);
    } catch (err) {
      console.error('Error loading today\'s entries:', err);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSearchQuery(contact.contact_person || contact.company_name || '');
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContact) {
      toast.error('Please select a customer');
      return;
    }

    setLoading(true);

    try {
      for (let i = 0; i < quantity; i++) {
        await api.mailItems.create({
          contact_id: selectedContact.contact_id,
          item_type: itemType,
          description: note,
          status: 'Received'
        });
      }

      toast.success(`${quantity} mail item(s) added successfully!`);
      
      setItemType('Letter');
      setQuantity(1);
      setNote('');
      setSearchQuery('');
      setSelectedContact(null);
      setDate(new Date().toISOString().split('T')[0]);
      
      loadTodaysEntries();
    } catch (err) {
      console.error('Error creating mail item:', err);
      toast.error('Failed to add mail item');
    } finally {
      setLoading(false);
    }
  };

  const markAsNotified = async (mailItemId: string) => {
    try {
      await api.mailItems.updateStatus(mailItemId, 'Notified');
      toast.success('Marked as notified!');
      loadTodaysEntries();
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className={embedded ? '' : 'max-w-7xl mx-auto px-6 py-8'}>
      {/* Header - only show if not embedded */}
      {!embedded && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mail Intake</h1>
          <p className="text-gray-600">Add new mail items</p>
        </div>
      )}

      {/* Add New Mail Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Mail</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Letter">Letter</option>
              <option value="Package">Package</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Note */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add any relevant notes..."
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {/* Link to Customer */}
        <div className="mb-6 relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Link to Customer</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name / Company / Mailbox #..."
              className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Dropdown Results */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((contact) => (
                <button
                  key={contact.contact_id}
                  type="button"
                  onClick={() => handleSelectContact(contact)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {contact.contact_person || contact.company_name}
                  </div>
                  <div className="text-sm text-gray-600 flex gap-4">
                    {contact.mailbox_number && <span>📮 {contact.mailbox_number}</span>}
                    {contact.unit_number && <span>🏢 Unit {contact.unit_number}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected Contact Display */}
          {selectedContact && (
            <div className="mt-3 px-4 py-3 bg-green-50 border border-green-300 rounded-lg flex justify-between items-center">
              <div>
                <div className="text-green-700 font-medium">
                  ✓ {selectedContact.contact_person || selectedContact.company_name}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedContact.mailbox_number && `Mailbox: ${selectedContact.mailbox_number}`}
                  {selectedContact.unit_number && ` • Unit: ${selectedContact.unit_number}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedContact(null);
                  setSearchQuery('');
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedContact}
          className="w-full py-3 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Saving...' : 'Save Mail Entry'}</span>
        </button>
      </form>

      {/* Today's Entries */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Today's Entries</h2>
        </div>

        {todaysEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600">No entries yet today</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Quantity</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Note</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {todaysEntries.map((entry) => (
                  <tr key={entry.mail_item_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-2">
                        {entry.item_type === 'Package' ? (
                          <Package className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Mail className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-gray-900">{entry.item_type}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-900">1</td>
                    <td className="py-4 px-6 text-gray-900">
                      {entry.contacts?.contact_person || entry.contacts?.company_name || 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        entry.status === 'Received' ? 'bg-black text-white' :
                        entry.status === 'Notified' ? 'bg-gray-200 text-gray-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{entry.description || '—'}</td>
                    <td className="py-4 px-6">
                      {entry.status === 'Received' && (
                        <button
                          onClick={() => markAsNotified(entry.mail_item_id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded-lg border border-gray-300"
                        >
                          <Bell className="w-4 h-4" />
                          <span>Mark as Notified</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
