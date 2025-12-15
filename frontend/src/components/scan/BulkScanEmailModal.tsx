/**
 * Bulk Scan Email Preview Modal
 *
 * Allows staff to preview and edit email templates before sending
 * bulk notifications from scan session
 */

import React, { useState, useEffect } from 'react';
import Modal from '../Modal.tsx';
import { api } from '../../lib/api-client.ts';
import toast from 'react-hot-toast';
import { Send, Edit2, Eye, Loader } from 'lucide-react';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
  email?: string;
}

interface GroupedScanResult {
  contact: Contact;
  letterCount: number;
  packageCount: number;
  totalCount: number;
}

interface Template {
  template_id: string;
  template_name: string;
  subject_line: string;
  message_body: string;
}

interface BulkScanEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupedScanResult[];
  onConfirm: (templateId: string, customSubject?: string, customBody?: string) => Promise<void>;
  sending: boolean;
}

export default function BulkScanEmailModal({
  isOpen,
  onClose,
  groups,
  onConfirm,
  sending
}: BulkScanEmailModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTemplate && !isEditing) {
      setCustomSubject(selectedTemplate.subject_line);
      setCustomBody(selectedTemplate.message_body);
    }
  }, [selectedTemplate, isEditing]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await api.templates.getAll();
      console.log('Templates API response:', response);

      // Backend returns { templates: [...] }
      const templatesList: Template[] = response?.templates || response || [];
      console.log('Templates list:', templatesList);

      if (!Array.isArray(templatesList)) {
        console.error('Templates is not an array:', templatesList);
        setTemplates([]);
        return;
      }

      // Show ALL templates
      setTemplates(templatesList);

      // Auto-select "New Mail Notification" template for scan sessions
      if (templatesList.length > 0) {
        const newMailTemplate = templatesList.find(
          t => t.template_name === 'New Mail Notification' || 
               t.template_name?.toLowerCase().includes('new mail')
        );
        setSelectedTemplate(newMailTemplate || templatesList[0]);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTemplate) {
      toast.error('Please select an email template');
      return;
    }

    await onConfirm(
      selectedTemplate.template_id,
      isEditing ? customSubject : undefined,
      isEditing ? customBody : undefined
    );
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setIsEditing(false);
    setCustomSubject('');
    setCustomBody('');
    onClose();
  };

  // Get preview data for the first contact
  const previewContact = groups && groups.length > 0 && groups[0]?.contact ? groups[0].contact : null;
  const previewData = previewContact && groups[0] ? {
    customerName: previewContact.contact_person || previewContact.company_name || 'Customer',
    mailboxNumber: previewContact.mailbox_number || 'N/A',
    letterCount: groups[0].letterCount || 0,
    packageCount: groups[0].packageCount || 0,
  } : null;

  // Replace template variables with preview data
  const getPreviewText = (text: string) => {
    if (!previewData) return text;

    // Replace both {{VAR}} and {VAR} formats (matching backend behavior)
    return text
      // Name
      .replace(/\{\{Name\}\}/g, previewData.customerName)
      .replace(/\{Name\}/g, previewData.customerName)
      // BoxNumber
      .replace(/\{\{BoxNumber\}\}/g, previewData.mailboxNumber)
      .replace(/\{BoxNumber\}/g, previewData.mailboxNumber)
      // LetterCount
      .replace(/\{\{LetterCount\}\}/g, previewData.letterCount.toString())
      .replace(/\{LetterCount\}/g, previewData.letterCount.toString())
      // PackageCount
      .replace(/\{\{PackageCount\}\}/g, previewData.packageCount.toString())
      .replace(/\{PackageCount\}/g, previewData.packageCount.toString())
      // TotalCount
      .replace(/\{\{TotalCount\}\}/g, (previewData.letterCount + previewData.packageCount).toString())
      .replace(/\{TotalCount\}/g, (previewData.letterCount + previewData.packageCount).toString())
      // LetterText (plural)
      .replace(/\{\{LetterText\}\}/g, previewData.letterCount === 1 ? 'letter' : 'letters')
      .replace(/\{LetterText\}/g, previewData.letterCount === 1 ? 'letter' : 'letters')
      // PackageText (plural)
      .replace(/\{\{PackageText\}\}/g, previewData.packageCount === 1 ? 'package' : 'packages')
      .replace(/\{PackageText\}/g, previewData.packageCount === 1 ? 'package' : 'packages')
      // Date
      .replace(/\{\{Date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{Date\}/g, new Date().toLocaleDateString());
  };

  const displaySubject = isEditing ? customSubject : (selectedTemplate?.subject_line || '');
  const displayBody = isEditing ? customBody : (selectedTemplate?.message_body || '');

  const groupCount = groups?.length || 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="📧 Email Preview & Edit">
      <div className="space-y-4">
        {/* Recipients Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Recipients ({groupCount})</h3>
          <p className="text-sm text-blue-800">
            Email notifications will be sent to <strong>{groupCount}</strong> customer{groupCount !== 1 ? 's' : ''}
            with new mail.
          </p>
        </div>

        {/* Template Selection */}
        {loadingTemplates ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Template
              </label>
              <select
                value={selectedTemplate?.template_id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t.template_id === e.target.value);
                  setSelectedTemplate(template || null);
                  setIsEditing(false);
                }}
                disabled={sending}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.template_id} value={template.template_id}>
                    {template.template_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <>
                {/* Edit Mode Toggle */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Email Preview</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={sending}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isEditing
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {isEditing ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Preview Mode
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4" />
                        Edit Content
                      </>
                    )}
                  </button>
                </div>

                {/* Subject Line */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      disabled={sending}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      placeholder="Email subject..."
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                      {getPreviewText(displaySubject)}
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  {isEditing ? (
                    <textarea
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      disabled={sending}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 font-mono text-sm"
                      placeholder="Email message..."
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {getPreviewText(displayBody)}
                    </div>
                  )}
                  {!isEditing && previewData && (
                    <p className="text-xs text-gray-500 mt-1">
                      Preview shown for: {previewData.customerName}
                    </p>
                  )}
                </div>

                {isEditing && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-900 font-medium mb-1">Template Variables</p>
                    <p className="text-xs text-amber-800">
                      Use these variables (they'll be replaced with actual values for each customer):
                    </p>
                    <ul className="text-xs text-amber-800 mt-1 space-y-0.5">
                      <li>• <code className="bg-amber-100 px-1 rounded">{'{{Name}}'}</code> or <code className="bg-amber-100 px-1 rounded">{'{Name}'}</code> - Customer name</li>
                      <li>• <code className="bg-amber-100 px-1 rounded">{'{{BoxNumber}}'}</code> or <code className="bg-amber-100 px-1 rounded">{'{BoxNumber}'}</code> - Mailbox number</li>
                      <li>• <code className="bg-amber-100 px-1 rounded">{'{{LetterCount}}'}</code> or <code className="bg-amber-100 px-1 rounded">{'{LetterCount}'}</code> - Number of letters</li>
                      <li>• <code className="bg-amber-100 px-1 rounded">{'{{PackageCount}}'}</code> or <code className="bg-amber-100 px-1 rounded">{'{PackageCount}'}</code> - Number of packages</li>
                      <li>• <code className="bg-amber-100 px-1 rounded">{'{{TotalCount}}'}</code> - Total items (letters + packages)</li>
                      <li>• <code className="bg-amber-100 px-1 rounded">{'{{Date}}'}</code> - Today's date</li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={sending || !selectedTemplate}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send to {groupCount} Customer{groupCount !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
