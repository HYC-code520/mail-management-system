import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Package, Calendar } from 'lucide-react';
import { api } from '../lib/api-client.ts';
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
}

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  pickup_date?: string;
  description?: string;
}

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [mailHistory, setMailHistory] = useState<MailItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadContactDetails();
      loadMailHistory();
    }
  }, [id]);

  const loadContactDetails = async () => {
    try {
      const data = await api.contacts.getById(id!);
      setContact(data);
    } catch (err) {
      console.error('Error loading contact:', err);
      toast.error('Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

  const loadMailHistory = async () => {
    try {
      const data = await api.mailItems.getAll(id);
      setMailHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading mail history:', err);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {contact.contact_person || contact.company_name || 'Unnamed Contact'}
        </h1>
        <p className="text-gray-600">Customer Profile</p>
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

            {/* Type */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Type</p>
              <span className="inline-block px-3 py-1 bg-black text-white text-xs font-medium rounded">
                {contact.customer_type || 'Business'}
              </span>
            </div>

            {/* Subscription Status */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Subscription Status</p>
              <p className="text-gray-900 font-medium">{contact.subscription_status || 'Thinking'}</p>
            </div>
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
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {mailHistory.map((item) => (
                    <tr key={item.mail_item_id} className="border-b border-gray-100 hover:bg-gray-50">
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
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded text-xs font-medium ${
                          item.status === 'Pending' ? 'bg-black text-white' :
                          item.status === 'Picked Up' ? 'bg-gray-200 text-gray-700' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-700">{item.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
