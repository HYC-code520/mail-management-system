import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, ArchiveRestore, Eye, Edit, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Mail } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import BulkEmailModal from '../components/BulkEmailModal.tsx';
import { validateContactForm } from '../utils/validation.ts';

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
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  
  // Sorting states
  const [sortColumn, setSortColumn] = useState<'mailbox' | 'name' | 'status'>('mailbox');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Form data
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

  const loadContacts = useCallback(async () => {
    try {
      const data = await api.contacts.getAll();
      const contactsList = Array.isArray(data) ? data : [];
      setAllContacts(contactsList); // Store all contacts - filtering happens in useEffect
    } catch (err) {
      console.error('Error loading contacts:', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - just loads data once

  useEffect(() => {
    void loadContacts(); // Explicitly ignore the promise
  }, [loadContacts]);

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
        [name]: name === 'service_tier' ? parseInt(value) : value
      }));
    }
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

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      contact_person: contact.contact_person || '',
      company_name: contact.company_name || '',
      mailbox_number: contact.mailbox_number || '',
      unit_number: contact.unit_number || '',
      email: contact.email || '',
      phone_number: contact.phone_number || '',
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
      language_preference: 'English',
      service_tier: 1,
      status: 'Pending'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateContactForm(formData);
    
    if (!validation.isValid) {
      // Display validation errors
      if (validation.errors.general) {
        toast.error(validation.errors.general);
      }
      
      Object.entries(validation.errors).forEach(([field, error]) => {
        if (field !== 'general') {
          const fieldName = field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          toast.error(`${fieldName}: ${error}`);
        }
      });
      
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
    } catch (err: any) {
      console.error('Failed to save contact:', err);
      
      // Handle backend validation errors
      if (err.response?.data?.details) {
        const backendErrors = err.response.data.details;
        Object.entries(backendErrors).forEach(([field, error]) => {
          const fieldName = field.replace('_', ' ').replace(/\b\w/g, l => (l as string).toUpperCase());
          toast.error(`${fieldName}: ${error}`);
        });
      } else {
        toast.error(`Failed to ${editingContact ? 'update' : 'add'} customer: ${err.message || 'Unknown error'}`);
      }
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

  const handleSort = (column: 'mailbox' | 'name' | 'status') => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
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

  // Sorting
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'mailbox':
        comparison = (a.mailbox_number || '').localeCompare(b.mailbox_number || '');
        break;
      case 'name': {
        const nameA = a.contact_person || a.company_name || '';
        const nameB = b.contact_person || b.company_name || '';
        comparison = nameA.localeCompare(nameB);
        break;
      }
      case 'status':
        comparison = (a.status || '').localeCompare(b.status || '');
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="max-w-full mx-auto px-16 py-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner 
            message="Loading contacts..." 
            size="lg"
          />
        </div>
        <div className="animate-pulse space-y-6 opacity-50 mt-8">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-16 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Directory</h1>
          <p className="text-gray-600">Manage customer information</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Bulk Email Button */}
          <button
            onClick={() => setIsBulkEmailModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            title="Send bulk emails to multiple customers"
          >
            <Mail className="w-4 h-4" />
            <span>Bulk Email</span>
          </button>
          
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
                  {/* Contact Name - Sortable */}
                  <th 
                    className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Contact
                      {sortColumn === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Service Tier</th>
                  
                  {/* Mailbox # - Sortable */}
                  <th 
                    className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleSort('mailbox')}
                  >
                    <div className="flex items-center gap-2">
                      Mailbox #
                      {sortColumn === 'mailbox' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </th>
                  
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Unit #</th>
                  
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
                  
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedContacts.map((contact) => (
                  <tr 
                    key={contact.contact_id} 
                    onClick={() => navigate(`/dashboard/contacts/${contact.contact_id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">
                        {contact.contact_person || 'Unnamed'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {contact.company_name || '—'}
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
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                              {deletingContactId === contact.contact_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )}
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
                            {deletingContactId === contact.contact_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArchiveRestore className="w-4 h-4" />
                            )}
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
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
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
              </select>
            </div>
          </div>

          {/* Customer Status */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Customer Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="PENDING">Pending</option>
              <option value="Active">Active</option>
              <option value="No">Archived</option>
            </select>
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

      {/* Bulk Email Modal */}
      <BulkEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => setIsBulkEmailModalOpen(false)}
        contacts={filteredContacts}
      />
    </div>
  );
}
