import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  unit_number?: string;
}

export default function NewMailItemPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [formData, setFormData] = useState({
    contact_id: '',
    item_type: 'Package',
    description: '',
    status: 'Received'
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await api.contacts.getAll();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.contact_id) {
      toast.error('Please select a contact');
      return;
    }

    setLoading(true);

    try {
      await api.mailItems.create(formData);
      toast.success('Mail item logged successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(`Failed to create mail item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.contact_person && contact.company_name) {
      return `${contact.contact_person} - ${contact.company_name} (${contact.unit_number})`;
    }
    if (contact.contact_person) {
      return `${contact.contact_person} (${contact.unit_number})`;
    }
    if (contact.company_name) {
      return `${contact.company_name} (${contact.unit_number})`;
    }
    return `Unit ${contact.unit_number}`;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white">Add Mail Item</h1>
        <p className="text-zinc-400 mt-2">Log a new package or mail received</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
        <div className="space-y-6">
          {/* Contact Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Select Contact <span className="text-red-400">*</span>
            </label>
            {loadingContacts ? (
              <div className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-500">
                Loading contacts...
              </div>
            ) : (
              <select
                name="contact_id"
                value={formData.contact_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="">Select a contact...</option>
                {contacts.map(contact => (
                  <option key={contact.contact_id} value={contact.contact_id}>
                    {getContactDisplayName(contact)}
                  </option>
                ))}
              </select>
            )}
            {contacts.length === 0 && !loadingContacts && (
              <p className="mt-2 text-sm text-yellow-400">
                No contacts found. <button 
                  type="button"
                  onClick={() => navigate('/dashboard/contacts/new')}
                  className="underline hover:text-yellow-300"
                >
                  Create one first
                </button>
              </p>
            )}
          </div>

                 {/* Item Type */}
                 <div>
                   <label className="block text-sm font-medium text-zinc-300 mb-2">
                     Item Type <span className="text-red-400">*</span>
                   </label>
                   <select
                     name="item_type"
                     value={formData.item_type}
                     onChange={handleChange}
                     required
                     className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
                   >
                     <option value="Package">📦 Package</option>
                     <option value="Letter">✉️ Letter</option>
                   </select>
                 </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description / Notes
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="e.g., Large box from Alibaba, Electronics shipment, Legal documents..."
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Optional: Add any relevant details about the mail item
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="Received">Received (Just logged)</option>
              <option value="Notified">Notified (Already contacted customer)</option>
            </select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-400 flex items-start gap-2">
              <span>💡</span>
              <span>
                After creating this mail item, you can notify the customer by going to the Dashboard 
                and clicking on the item to send a message.
              </span>
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-zinc-700">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || contacts.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Add Mail Item'}
          </button>
        </div>
      </form>
    </div>
  );
}
