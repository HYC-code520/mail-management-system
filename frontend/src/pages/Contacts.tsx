import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, ArchiveRestore, Eye, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  unit_number?: string;
  mailbox_number?: string;
  email?: string;
  phone_number?: string;
  status?: string;
  language_preference?: string;
  service_tier?: number;
}

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]); // Store all contacts including archived
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false); // Toggle for showing archived
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    mailbox_number: '',
    unit_number: '',
    email: '',
    phone_number: '',
    wechat: '',
    language_preference: 'English',
    service_tier: 1,
    status: 'Pending'
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await api.contacts.getAll();
      const contactsList = Array.isArray(data) ? data : [];
      setAllContacts(contactsList); // Store all contacts
      
      // Filter based on showArchived toggle
      const filteredContacts = showArchived 
        ? contactsList.filter(c => c.status === 'No') // Show only archived
        : contactsList.filter(c => c.status !== 'No'); // Show only active
      
      setContacts(filteredContacts);
    } catch (err) {
      console.error('Error loading contacts:', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  // Re-filter when showArchived toggle changes
  useEffect(() => {
    if (allContacts.length > 0) {
      const filteredContacts = showArchived 
        ? allContacts.filter(c => c.status === 'No')
        : allContacts.filter(c => c.status !== 'No');
      setContacts(filteredContacts);
    }
  }, [showArchived, allContacts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'service_tier' ? parseInt(value) : value
    }));
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      contact_person: contact.contact_person || '',
      company_name: contact.company_name || '',
      mailbox_number: contact.mailbox_number || '',
      unit_number: contact.unit_number || '',
      email: contact.email || '',
      phone_number: contact.phone_number || '',
      wechat: '',
      language_preference: contact.language_preference || 'English',
      service_tier: contact.service_tier || 1,
      status: contact.status || 'Pending'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setFormData({
      contact_person: '',
      company_name: '',
      mailbox_number: '',
      unit_number: '',
      email: '',
      phone_number: '',
      wechat: '',
      language_preference: 'English',
      service_tier: 1,
      status: 'Pending'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contact_person && !formData.company_name) {
      toast.error('Please enter either a name or company name');
      return;
    }

    if (!formData.mailbox_number) {
      toast.error('Mailbox number is required');
      return;
    }

    setSaving(true);

    try {
      if (editingContact) {
        // Update existing contact
        await api.contacts.update(editingContact.contact_id, formData);
        toast.success('Customer updated successfully!');
      } else {
        // Create new contact
        await api.contacts.create(formData);
        toast.success('Customer added successfully!');
      }
      closeModal();
      loadContacts();
    } catch (err) {
      console.error('Failed to save contact:', err);
      toast.error(`Failed to ${editingContact ? 'update' : 'add'} customer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to archive this customer? You can restore it later from the archived view.')) {
      return;
    }

    setDeletingContactId(contactId);

    try {
      await api.contacts.delete(contactId);
      toast.success('Customer archived successfully!');
      loadContacts();
    } catch (err) {
      console.error('Failed to delete contact:', err);
      toast.error('Failed to archive customer');
    } finally {
      setDeletingContactId(null);
    }
  };

  const handleRestore = async (contactId: string) => {
    if (!confirm('Are you sure you want to restore this customer?')) {
      return;
    }

    setDeletingContactId(contactId);

    try {
      // Restore by setting status back to 'Active'
      await api.contacts.update(contactId, { status: 'Active' });
      toast.success('Customer restored successfully!');
      loadContacts();
    } catch (err) {
      console.error('Failed to restore contact:', err);
      toast.error('Failed to restore customer');
    } finally {
      setDeletingContactId(null);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = searchTerm === '' ||
      contact.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.mailbox_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone_number?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Directory</h1>
          <p className="text-gray-600">Manage customer information</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Show Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showArchived 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4" />
                <span>Viewing Archived</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                <span>Show Archived</span>
              </>
            )}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Name / Company / Mailbox # / Unit #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No customers yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first customer</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
            >
              + Add New Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Contact</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Service Tier</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Mailbox #</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Unit #</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.contact_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">
                        {contact.contact_person || contact.company_name || 'Unnamed'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {contact.email || '—'}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {contact.phone_number || '—'}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {contact.service_tier || '1'}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {contact.mailbox_number || '—'}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {contact.unit_number || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        contact.status === 'Active' ? 'bg-black text-white' :
                        contact.status === 'Pending' ? 'bg-gray-200 text-gray-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {contact.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {!showArchived && (
                          <>
                            <button
                              onClick={() => navigate(`/dashboard/contacts/${contact.contact_id}`)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors group relative"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                View
                              </span>
                            </button>
                            <button
                              onClick={() => navigate(`/dashboard/contacts/${contact.contact_id}/message`)}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors group relative"
                              title="Message"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Message
                              </span>
                            </button>
                            <button
                              onClick={() => openEditModal(contact)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors group relative"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Edit
                              </span>
                            </button>
                            <button
                              onClick={() => handleDelete(contact.contact_id)}
                              disabled={deletingContactId === contact.contact_id}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {deletingContactId === contact.contact_id ? 'Archiving...' : 'Archive'}
                              </span>
                            </button>
                          </>
                        )}
                        {showArchived && (
                          <button
                            onClick={() => handleRestore(contact.contact_id)}
                            disabled={deletingContactId === contact.contact_id}
                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative"
                            title="Restore"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {deletingContactId === contact.contact_id ? 'Restoring...' : 'Restore'}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredContacts.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredContacts.length} of {contacts.length} customers
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal}
        title={editingContact ? 'Edit Customer' : 'Add New Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name & Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Name</label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
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
                onChange={handleChange}
                placeholder="e.g., 101"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Service Tier</label>
              <select
                name="service_tier"
                value={formData.service_tier}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : (editingContact ? 'Update Customer' : 'Save Customer')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
