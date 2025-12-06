import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Package, Bell, ChevronRight, Send, Edit } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import SendEmailModal from '../components/SendEmailModal.tsx';
import Modal from '../components/Modal.tsx';
import { validateContactForm } from '../utils/validation.ts';
import toast from 'react-hot-toast';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  unit_number?: string;
  mailbox_number?: string;
  email?: string;
  phone_number?: string;
  wechat?: string;
  status?: string;
  language_preference?: string;
  service_tier?: number;
  customer_type?: string;
  subscription_status?: string;
  notes?: string;
  created_at?: string;
}

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  pickup_date?: string;
  description?: string;
  quantity?: number;
  tracking_number?: string;
  contact_id?: string;
  contacts?: {
    contact_id?: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
    email?: string;
    phone_number?: string;
  };
}

interface NotificationHistory {
  notification_id: string;
  notified_by: string;
  notification_method: string;
  notified_at: string;
  notes?: string;
}

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [mailHistory, setMailHistory] = useState<MailItem[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Record<string, NotificationHistory[]>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Send Email Modal states
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [emailingMailItem, setEmailingMailItem] = useState<MailItem | null>(null);
  
  // Edit Contact Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const loadContactDetails = useCallback(async () => {
    try {
      const data = await api.contacts.getById(id!);
      setContact(data);
    } catch (err) {
      console.error('Error loading contact:', err);
      toast.error('Failed to load contact details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMailHistory = useCallback(async () => {
    try {
      const data = await api.mailItems.getAll(id);
      setMailHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading mail history:', err);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void loadContactDetails(); // Explicitly ignore the promise
      void loadMailHistory(); // Explicitly ignore the promise
    }
  }, [id, loadContactDetails, loadMailHistory]);

  const loadNotificationHistoryForMailItem = async (mailItemId: string) => {
    try {
      const data = await api.notifications.getByMailItem(mailItemId);
      setNotificationHistory(prev => ({
        ...prev,
        [mailItemId]: data
      }));
    } catch (err) {
      console.error('Error loading notification history:', err);
    }
  };

  const toggleRow = (mailItemId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(mailItemId)) {
      newExpanded.delete(mailItemId);
    } else {
      newExpanded.add(mailItemId);
      // Load notification history when row is expanded
      if (!notificationHistory[mailItemId]) {
        loadNotificationHistoryForMailItem(mailItemId);
      }
    }
    setExpandedRows(newExpanded);
  };

  const openSendEmailModal = (item: MailItem) => {
    // Attach contact info to mail item if not already there
    if (!item.contacts && contact) {
      item.contacts = {
        contact_id: contact.contact_id,
        contact_person: contact.contact_person,
        company_name: contact.company_name,
        mailbox_number: contact.mailbox_number,
        email: contact.email,
        phone_number: contact.phone_number
      };
      item.contact_id = contact.contact_id;
    }
    setEmailingMailItem(item);
    setIsSendEmailModalOpen(true);
  };

  const handleEmailSuccess = () => {
    loadMailHistory(); // Refresh mail history after email sent
    setIsSendEmailModalOpen(false);
    setEmailingMailItem(null);
  };

  // Format phone number as user types: 917-822-5751
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limitedDigits = digits.slice(0, 10);
    
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    } else if (limitedDigits.length <= 6) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    } else {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
  };

  const openEditModal = () => {
    if (!contact) return;
    
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
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone_number') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'service_tier' ? parseInt(value) : value
      }));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateContactForm(formData);
    
    if (!validation.isValid) {
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
      await api.contacts.update(id!, formData);
      toast.success('Customer updated successfully!');
      closeEditModal();
      loadContactDetails(); // Refresh contact data
    } catch (err: any) {
      console.error('Failed to update contact:', err);
      
      if (err.response?.data?.details) {
        const backendErrors = err.response.data.details;
        Object.entries(backendErrors).forEach(([field, error]) => {
          const fieldName = field.replace('_', ' ').replace(/\b\w/g, l => (l as string).toUpperCase());
          toast.error(`${fieldName}: ${error}`);
        });
      } else {
        toast.error(`Failed to update customer: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };

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

  if (!contact) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Contact not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/contacts')}
        className="flex items-center gap-2 text-gray-900 hover:text-gray-700 mb-6 font-medium"
      >
        <span>←</span>
        <span>Back to Directory</span>
      </button>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {contact.contact_person || contact.company_name || 'Unnamed Contact'}
          </h1>
          <p className="text-gray-600">Customer Profile</p>
        </div>
        <button
          onClick={openEditModal}
          className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Contact
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Contact Information */}
        <div className="col-span-1 bg-white border border-gray-200 rounded-lg p-6 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Contact Information</h2>
          
          <div className="space-y-6">
            {/* Name */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Name</p>
              <p className="text-gray-900 font-medium">{contact.contact_person || '—'}</p>
            </div>

            {/* Company */}
            {contact.company_name && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Company</p>
                <p className="text-gray-900 font-medium">{contact.company_name}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900">{contact.email || '—'}</p>
              </div>
            </div>

            {/* Phone */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              <div className="flex items-center gap-2">
                <span>📞</span>
                <p className="text-gray-900">{contact.phone_number || '—'}</p>
              </div>
            </div>

            {/* Mailbox # */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Mailbox #</p>
              <p className="text-gray-900 font-medium">{contact.mailbox_number || '—'}</p>
            </div>

            {/* Unit # */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Unit #</p>
              <p className="text-gray-900 font-medium">{contact.unit_number || '—'}</p>
            </div>

            {/* Service Tier */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Service Tier</p>
              <p className="text-gray-900 font-medium">{contact.service_tier || '1'}</p>
            </div>

            {/* Language */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Language</p>
              <p className="text-gray-900 font-medium">{contact.language_preference || 'English'}</p>
            </div>

            {/* Subscription Status */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${
                contact.status === 'Active' ? 'bg-green-100 text-green-700' :
                contact.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                contact.status === 'No' ? 'bg-gray-100 text-gray-700' :
                'bg-gray-200 text-gray-700'
              }`}>
                {contact.status || 'PENDING'}
              </span>
            </div>

            {/* Customer Since */}
            {contact.created_at && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer Since</p>
                <p className="text-gray-900 font-medium">
                  {new Date(contact.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Mail History */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Mail History</h2>
          </div>

          <div className="overflow-x-auto">
            {mailHistory.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No mail history yet</p>
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
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Note</th>
                    <th className="text-right py-3 px-6 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mailHistory.map((item) => (
                    <React.Fragment key={item.mail_item_id}>
                      {/* Main Row */}
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
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
                          <span 
                            title={`Logged at: ${new Date(item.received_date).toLocaleString('en-US', {
                              timeZone: 'America/New_York',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                              timeZoneName: 'short'
                            })}`}
                            className="cursor-help border-b border-dotted border-gray-400"
                          >
                            {new Date(item.received_date).toISOString().split('T')[0]}
                          </span>
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
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded text-xs font-medium ${
                            item.status === 'Received' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            item.status === 'Notified' ? 'bg-purple-100 text-purple-700' :
                            item.status === 'Picked Up' ? 'bg-green-100 text-green-700' :
                            item.status === 'Scanned Document' ? 'bg-cyan-100 text-cyan-700' :
                            item.status === 'Forward' ? 'bg-orange-100 text-orange-700' :
                            item.status === 'Abandoned Package' ? 'bg-red-100 text-red-700' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-700">{item.description || '—'}</td>
                        <td className="py-4 px-6 text-right">
                          {item.status !== 'Picked Up' && item.status !== 'Abandoned Package' && contact?.email && (
                            <button
                              onClick={() => openSendEmailModal(item)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2 ml-auto"
                            >
                              <Send className="w-4 h-4" />
                              Send Email
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Row - Notification History */}
                      {expandedRows.has(item.mail_item_id) && (
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <td colSpan={6} className="py-6 px-6">
                            <div className="ml-10">
                              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-purple-600" />
                                Notification History
                              </h4>
                              {notificationHistory[item.mail_item_id]?.length > 0 ? (
                                <div className="space-y-3">
                                  {notificationHistory[item.mail_item_id].map((notif) => (
                                    <div key={notif.notification_id} className="bg-white p-3 rounded-lg border border-gray-200">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900">
                                              {new Date(notif.notified_at).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                              })}
                                            </span>
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                              {notif.notification_method}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-600">
                                            Notified by: <span className="font-medium text-gray-900">{notif.notified_by}</span>
                                          </p>
                                          {notif.notes && (
                                            <p className="text-sm text-gray-600 mt-1 italic">
                                              Note: {notif.notes}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">
                                  No notifications sent for this mail item yet.
                                </p>
                              )}
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
        </div>
      </div>
      
      {/* Send Email Modal */}
      {emailingMailItem && (
        <SendEmailModal
          isOpen={isSendEmailModalOpen}
          onClose={() => {
            setIsSendEmailModalOpen(false);
            setEmailingMailItem(null);
          }}
          mailItem={emailingMailItem}
          onSuccess={handleEmailSuccess}
        />
      )}
      
      {/* Edit Contact Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={closeEditModal}
        title="Edit Contact"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Contact Person */}
            <div>
              <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                id="contact_person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleFormChange}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleFormChange}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Mailbox Number */}
            <div>
              <label htmlFor="mailbox_number" className="block text-sm font-medium text-gray-700 mb-1">
                Mailbox # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="mailbox_number"
                name="mailbox_number"
                value={formData.mailbox_number}
                onChange={handleFormChange}
                placeholder="A123"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Unit Number */}
            <div>
              <label htmlFor="unit_number" className="block text-sm font-medium text-gray-700 mb-1">
                Unit #
              </label>
              <input
                type="text"
                id="unit_number"
                name="unit_number"
                value={formData.unit_number}
                onChange={handleFormChange}
                placeholder="101"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleFormChange}
                placeholder="917-822-5751"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Language Preference */}
            <div>
              <label htmlFor="language_preference" className="block text-sm font-medium text-gray-700 mb-1">
                Language Preference
              </label>
              <select
                id="language_preference"
                name="language_preference"
                value={formData.language_preference}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="English">English</option>
                <option value="Chinese">Chinese</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>

            {/* Service Tier */}
            <div>
              <label htmlFor="service_tier" className="block text-sm font-medium text-gray-700 mb-1">
                Service Tier
              </label>
              <select
                id="service_tier"
                name="service_tier"
                value={formData.service_tier}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>Tier 1</option>
                <option value={2}>Tier 2</option>
                <option value={3}>Tier 3</option>
              </select>
            </div>

            {/* Status */}
            <div className="col-span-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="No">Archived</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
