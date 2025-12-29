import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';

export default function NewContactPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    mailbox_number: '',
    unit_number: '',
    email: '',
    phone_number: '',
    language_preference: 'English',
    customer_type: 'Tenant',
    status: 'Pending',
    display_name_preference: 'auto'
  });

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
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.contact_person && !formData.company_name) {
      toast.error('Please enter either a name or company name');
      return;
    }

    if (!formData.mailbox_number) {
      toast.error('Mailbox number is required');
      return;
    }

    // Validate phone number if provided
    if (formData.phone_number) {
      const digitsOnly = formData.phone_number.replace(/\D/g, '');
      if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
        toast.error('Phone number must be exactly 10 digits');
        return;
      }
    }

    setLoading(true);

    try {
      await api.contacts.create(formData);
      toast.success('Customer added successfully!');
      navigate('/dashboard/contacts');
    } catch (err) {
      console.error('Failed to create contact:', err);
      toast.error(`Failed to add customer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/contacts')}
        className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2"
      >
        <span>←</span>
        <span>Back to Customers</span>
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Customer</h1>
        <p className="text-gray-600">Enter customer information</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm max-w-3xl">
        <div className="space-y-6">
          {/* Name & Company - Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Name
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
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Company
              </label>
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

          {/* Mailbox & Language - Row 2 */}
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
                placeholder="e.g., MB-101"
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Preferred Language
              </label>
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

          {/* Email & Phone - Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
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
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Phone
              </label>
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

          {/* Unit # & Status - Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Unit #
              </label>
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
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Customer Type - Row 5 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Customer Type
            </label>
            <select
              name="customer_type"
              value={formData.customer_type}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Tenant">Tenant</option>
              <option value="Business">Business</option>
              <option value="Individual">Individual</option>
            </select>
          </div>

          {/* Display Name Preference - Row 6 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Display Name Preference
              <span className="text-xs text-gray-500 ml-2 font-normal">
                How should this customer appear in lists?
              </span>
            </label>
            <select
              name="display_name_preference"
              value={formData.display_name_preference}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="auto">Auto (Smart - Show what's available)</option>
              <option value="company">Company Name Only</option>
              <option value="person">Person Name Only</option>
              <option value="both">Both (Company - Person)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.display_name_preference === 'auto' && 'Will show both if available, or fallback gracefully'}
              {formData.display_name_preference === 'company' && formData.company_name && `Will show: "${formData.company_name}"`}
              {formData.display_name_preference === 'company' && !formData.company_name && 'Will show company name (enter company name above)'}
              {formData.display_name_preference === 'person' && formData.contact_person && `Will show: "${formData.contact_person}"`}
              {formData.display_name_preference === 'person' && !formData.contact_person && 'Will show person name (enter name above)'}
              {formData.display_name_preference === 'both' && formData.company_name && formData.contact_person && 
                `Will show: "${formData.company_name} - ${formData.contact_person}"`}
              {formData.display_name_preference === 'both' && (!formData.company_name || !formData.contact_person) && 
                'Will show both names (enter both above)'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard/contacts')}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
