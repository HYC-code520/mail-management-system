'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function NewContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    unit_number: '',
    contact_person: '',
    language_preference: 'English',
    email: '',
    phone_number: '',
    service_tier: 1,
    options: '',
    mailbox_number: '',
    status: 'PENDING'
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Contact created successfully!');
        router.push('/dashboard/contacts');
      } else {
        const error = await response.text();
        alert(`Failed to create contact: ${error}`);
      }
    } catch (err) {
      alert('Failed to create contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'service_tier' ? parseInt(value) : value
    }));
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white">Add New Contact</h1>
        <p className="text-zinc-400 mt-2">Enter the customer information below</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
        <div className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              placeholder="e.g., Zhang Import/Export LLC"
              className="w-full px-4 py-2 bg-black border border-zinc-500 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Unit Number */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Unit Number <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="unit_number"
              value={formData.unit_number}
              onChange={handleChange}
              required
              placeholder="e.g., F14-F15, C8"
              className="w-full px-4 py-2 bg-black border border-zinc-500 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Contact Person
            </label>
            <input
              type="text"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              placeholder="e.g., David Zhang"
              className="w-full px-4 py-2 bg-black border border-zinc-500 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@company.com"
                className="w-full px-4 py-2 bg-black border border-zinc-500 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2 bg-black border border-zinc-500 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Language Preference */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Language Preference
            </label>
            <select
              name="language_preference"
              value={formData.language_preference}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="English">English</option>
              <option value="Mandarin">Mandarin</option>
              <option value="English/Mandarin">English/Mandarin</option>
              <option value="Spanish">Spanish</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Service Tier & Mailbox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Service Tier
              </label>
              <select
                name="service_tier"
                value={formData.service_tier}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
              >
                <option value={1}>Tier 1 - Basic</option>
                <option value={2}>Tier 2 - Standard</option>
                <option value={3}>Tier 3 - Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Mailbox Number
              </label>
              <input
                type="text"
                name="mailbox_number"
                value={formData.mailbox_number}
                onChange={handleChange}
                placeholder="e.g., D1, D2"
                className="w-full px-4 py-2 bg-black border border-zinc-500 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
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
              <option value="Active">Active</option>
              <option value="PENDING">PENDING</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Options/Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Options / Notes
            </label>
            <textarea
              name="options"
              value={formData.options}
              onChange={handleChange}
              rows={3}
              placeholder="e.g., High Volume, Special handling instructions..."
              className="w-full px-4 py-2 bg-black border border-zinc-500 rounded text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-zinc-700">
          <Button
            variant="slim"
            type="button"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="flat"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Contact'}
          </Button>
        </div>
      </form>
    </div>
  );
}

