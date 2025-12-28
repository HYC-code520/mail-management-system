/**
 * Bulk Email Modal Component
 * 
 * Allows staff to send bulk emails to multiple customers
 * (e.g., office closure, holiday greetings, announcements)
 */

import React, { useState, useEffect } from 'react';
import Modal from './Modal.tsx';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import { Mail, Send } from 'lucide-react';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
  email?: string;
}

interface Template {
  template_id: string;
  template_name: string;
  subject_line: string;
  message_body: string;
}

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
}

export default function BulkEmailModal({ isOpen, onClose, contacts }: BulkEmailModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [sentBy, setSentBy] = useState('Madison');

  // Only show contacts with email addresses
  const emailableContacts = contacts.filter(c => c.email && c.email.trim() !== '');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const data = await api.templates.getAll();
      // Backend returns { templates: [...] }
      const templatesList = data?.templates || data || [];
      console.log('Templates loaded:', templatesList);
      // Show all templates for bulk email
      setTemplates(Array.isArray(templatesList) ? templatesList : []);
    } catch (err) {
      console.error('Error loading templates:', err);
      toast.error('Failed to load templates');
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.contact_id)));
    }
  };

  const filteredContacts = emailableContacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (contact.contact_person?.toLowerCase().includes(searchLower)) ||
      (contact.company_name?.toLowerCase().includes(searchLower)) ||
      (contact.mailbox_number?.toLowerCase().includes(searchLower)) ||
      (contact.email?.toLowerCase().includes(searchLower))
    );
  });

  const handleSend = async () => {
    if (selectedContacts.size === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!selectedTemplate) {
      toast.error('Please select an email template');
      return;
    }

    setSending(true);
    try {
      let successCount = 0;
      let failCount = 0;

      // Send emails one by one
      for (const contactId of Array.from(selectedContacts)) {
        try {
          await api.emails.sendWithTemplate({
            contact_id: contactId,
            template_id: selectedTemplate.template_id,
            sent_by: sentBy
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to send email to contact ${contactId}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `✅ Sent ${successCount} email${successCount > 1 ? 's' : ''} successfully!` +
          (failCount > 0 ? ` (${failCount} failed)` : ''),
          { duration: 5000 }
        );
      }

      if (failCount > 0 && successCount === 0) {
        toast.error(`❌ Failed to send all ${failCount} emails`);
      }

      handleClose();
    } catch (err) {
      console.error('Error sending bulk emails:', err);
      toast.error('Failed to send bulk emails');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSelectedContacts(new Set());
    setSearchTerm('');
    setSelectedTemplate(null);
    setSentBy('Madison');
    onClose();
  };

  const previewEmail = () => {
    if (!selectedTemplate) return { subject: '', body: '' };

    // For bulk emails, we can't use customer-specific variables
    // Show a generic preview
    return {
      subject: selectedTemplate.subject_line,
      body: selectedTemplate.message_body
        .replace(/{CustomerName}/g, '[Customer Name]')
        .replace(/{MailboxNumber}/g, '[Mailbox #]')
        .replace(/{ItemSummary}/g, '')
        .replace(/{TotalItems}/g, '')
        .replace(/{FeeSummary}/g, '')
        .replace(/{.*?}/g, '') // Remove any other variables
    };
  };

  const preview = previewEmail();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="📧 Send Bulk Email">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Sent By Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sent by: <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSentBy('Madison')}
              disabled={sending}
              className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                sentBy === 'Madison'
                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              Madison
            </button>
            <button
              type="button"
              onClick={() => setSentBy('Merlin')}
              disabled={sending}
              className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                sentBy === 'Merlin'
                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              Merlin
            </button>
          </div>
        </div>

        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Template: <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedTemplate?.template_id || ''}
            onChange={(e) => {
              const template = templates.find(t => t.template_id === e.target.value);
              setSelectedTemplate(template || null);
            }}
            disabled={sending}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a template...</option>
            {templates.map((template) => (
              <option key={template.template_id} value={template.template_id}>
                {template.template_name}
              </option>
            ))}
          </select>
        </div>

        {/* Email Preview */}
        {selectedTemplate && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">EMAIL PREVIEW</p>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">Subject:</span>
                <p className="text-sm font-medium text-gray-900">{preview.subject}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Body:</span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview.body}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recipient Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Recipients: <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-gray-600">
              {selectedContacts.size} of {filteredContacts.length} selected
            </span>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={sending}
            className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Select All */}
          <button
            onClick={toggleAll}
            disabled={sending}
            className="w-full px-3 py-2 mb-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {selectedContacts.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
          </button>

          {/* Contact List */}
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? 'No customers match your search' : 'No customers with email addresses found'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <label
                    key={contact.contact_id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.contact_id)}
                      onChange={() => toggleContact(contact.contact_id)}
                      disabled={sending}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.contact_person || contact.company_name || 'Unnamed'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        📮 {contact.mailbox_number} • {contact.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={handleClose}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || selectedContacts.size === 0 || !selectedTemplate}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Mail className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {selectedContacts.size} recipient{selectedContacts.size !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

