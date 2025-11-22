import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, Search, ChevronRight } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  pickup_date?: string;
  description?: string;
  last_notified?: string;
  contact_id: string;
  contacts?: {
    contact_id: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
    unit_number?: string;
  };
}

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
}

interface LogPageProps {
  embedded?: boolean;
}

export default function LogPage({ embedded = false }: LogPageProps) {
  const navigate = useNavigate();
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMailItem, setEditingMailItem] = useState<MailItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    contact_id: '',
    item_type: 'Package',
    description: '',
    status: 'Received'
  });

  useEffect(() => {
    loadMailItems();
    loadContacts();
  }, []);

  const loadMailItems = async () => {
    try {
      const data = await api.mailItems.getAll();
      setMailItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading mail items:', err);
      toast.error('Failed to load mail log');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await api.contacts.getAll();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  const openEditModal = (mailItem: MailItem) => {
    setEditingMailItem(mailItem);
    setFormData({
      contact_id: mailItem.contact_id || '',
      item_type: mailItem.item_type || 'Package',
      description: mailItem.description || '',
      status: mailItem.status || 'Received'
    });
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditingMailItem(null);
    setFormData({
      contact_id: '',
      item_type: 'Package',
      description: '',
      status: 'Received'
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contact_id) {
      toast.error('Please select a customer');
      return;
    }

    setSaving(true);

    try {
      if (editingMailItem) {
        await api.mailItems.update(editingMailItem.mail_item_id, formData);
        toast.success('Mail item updated successfully!');
      }
      closeModal();
      loadMailItems();
    } catch (err) {
      console.error('Failed to update mail item:', err);
      toast.error('Failed to update mail item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mailItemId: string) => {
    if (!confirm('Are you sure you want to delete this mail item? This action cannot be undone.')) {
      return;
    }

    setDeletingItemId(mailItemId);

    try {
      await api.mailItems.delete(mailItemId);
      toast.success('Mail item deleted successfully!');
      loadMailItems();
    } catch (err) {
      console.error('Failed to delete mail item:', err);
      toast.error('Failed to delete mail item');
    } finally {
      setDeletingItemId(null);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const filteredItems = mailItems.filter((item) => {
    const matchesSearch = searchTerm === '' ||
      item.contacts?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contacts?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
    const matchesType = typeFilter === 'All Types' || item.item_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
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
    <div className={embedded ? '' : 'max-w-7xl mx-auto px-6 py-8'}>
      {/* Header - only show if not embedded */}
      {!embedded && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mail Log</h1>
          <p className="text-gray-600">Complete history of mail activities</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option>All Status</option>
          <option>Pending</option>
          <option>Notified</option>
          <option>Picked Up</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option>All Types</option>
          <option>Letter</option>
          <option>Package</option>
        </select>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No mail items found</p>
            <button
              onClick={() => navigate('/dashboard/intake')}
              className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
            >
              Add Mail Item
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700 w-10"></th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Last Notified</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Notes</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <React.Fragment key={item.mail_item_id}>
                  {/* Main Row */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <button
                        onClick={() => toggleRow(item.mail_item_id)}
                        className="text-gray-500 hover:text-gray-700 transition-transform"
                        style={{
                          transform: expandedRows.has(item.mail_item_id) ? 'rotate(90deg)' : 'rotate(0deg)',
                          display: 'inline-block',
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-4 px-6 text-gray-900">
                      {new Date(item.received_date).toISOString().split('T')[0]}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-700">
                        {item.item_type === 'Package' ? (
                          <Package className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Mail className="w-4 h-4 text-gray-500" />
                        )}
                        <span>{item.item_type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-900">
                      {item.contacts?.contact_person || item.contacts?.company_name || 'Unknown'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        item.status === 'Pending' ? 'bg-black text-white' :
                        item.status === 'Notified' ? 'bg-gray-200 text-gray-700' :
                        item.status === 'Picked Up' ? 'bg-gray-200 text-gray-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {item.last_notified || '—'}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {item.description || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.mail_item_id)}
                          disabled={deletingItemId === item.mail_item_id}
                          className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingItemId === item.mail_item_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Details */}
                  {expandedRows.has(item.mail_item_id) && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan={8} className="py-6 px-6">
                        <div className="space-y-6">
                          {/* Notification History */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3">Notification History</h3>
                            <div className="space-y-2 text-sm text-gray-700">
                              <p>• 2025-11-10 9:00 AM - Email - Sent by Merlin</p>
                              <p>• 2025-11-10 1:00 PM - Phone - Sent by Madison</p>
                            </div>
                          </div>

                          {/* Follow-up Notes */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3">Follow-up Notes</h3>
                            <div className="space-y-2 text-sm text-gray-700">
                              <p>• Customer picked up at 3:45 PM</p>
                              <p>• ID verified</p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredItems.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredItems.length} of {mailItems.length} items
        </div>
      )}

      {/* Edit Mail Item Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={closeModal}
        title="Edit Mail Item"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Customer *</label>
            <select
              name="contact_id"
              value={formData.contact_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a customer</option>
              {contacts.map(contact => (
                <option key={contact.contact_id} value={contact.contact_id}>
                  {contact.contact_person || contact.company_name} - {contact.mailbox_number}
                </option>
              ))}
            </select>
          </div>

          {/* Mail Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Mail Type *</label>
            <select
              name="item_type"
              value={formData.item_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Letter">Letter</option>
              <option value="Package">Package</option>
              <option value="Certified Mail">Certified Mail</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
              <option value="Notified">Notified</option>
              <option value="Picked Up">Picked Up</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add any notes about this mail item..."
              rows={3}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Updating...' : 'Update Mail Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
