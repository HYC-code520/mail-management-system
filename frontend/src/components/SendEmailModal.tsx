import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, Mail, Eye, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client';
import toast from 'react-hot-toast';

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  quantity?: number;
  tracking_number?: string;
  contacts?: {
    contact_id?: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
    email?: string;
    phone_number?: string;
  };
}

interface Template {
  template_id: string;
  template_name: string;
  template_type: string;
  subject_line?: string;
  message_body: string;
}

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailItem: MailItem;
  onSuccess: () => void;
}

export default function SendEmailModal({ isOpen, onClose, mailItem, onSuccess }: SendEmailModalProps) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadLatestContactEmail();
    }
  }, [isOpen]);

  const loadLatestContactEmail = async () => {
    // Refresh the contact email in case it was updated
    if (mailItem.contacts?.contact_id) {
      try {
        const contactData = await api.contacts.getById(mailItem.contacts.contact_id);
        setCurrentEmail(contactData.email || null);
      } catch (error) {
        console.error('Error loading contact email:', error);
        setCurrentEmail(mailItem.contacts?.email || null);
      }
    } else {
      setCurrentEmail(mailItem.contacts?.email || null);
    }
  };

  const handleEditContact = () => {
    // Navigate directly to the contact's detail page
    if (mailItem.contacts?.contact_id) {
      const customerName = mailItem.contacts?.contact_person || mailItem.contacts?.company_name || 'the customer';
      
      onClose();
      navigate(`/dashboard/contacts/${mailItem.contacts.contact_id}`);
      
      // Show a helpful toast
      toast.success(
        `Viewing ${customerName}'s profile. Click "Edit Contact" to add their email.`,
        { duration: 6000, icon: '📝' }
      );
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await api.templates.getAll();
      setTemplates(response.templates || []);
      
      // Auto-select first template if available
      if (response.templates && response.templates.length > 0) {
        const firstTemplate = response.templates[0];
        setSelectedTemplateId(firstTemplate.template_id);
        previewTemplate(firstTemplate);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const previewTemplate = (template: Template) => {
    // Substitute variables in subject and message
    const customerName = mailItem.contacts?.contact_person || mailItem.contacts?.company_name || 'Customer';
    const mailboxNumber = mailItem.contacts?.mailbox_number || 'N/A';
    const receivedDate = new Date(mailItem.received_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let subjectPreview = template.subject_line || 'Mail Notification';
    let messagePreview = template.message_body || '';

    // Replace common variables
    const replacements: Record<string, string> = {
      '{Name}': customerName,
      '{BoxNumber}': mailboxNumber,
      '{Type}': mailItem.item_type || 'Mail',
      '{Date}': receivedDate,
      '{Quantity}': mailItem.quantity?.toString() || '1',
      '{TrackingNumber}': mailItem.tracking_number || 'N/A',
      '{{contact_name}}': customerName,
      '{{item_type}}': mailItem.item_type || 'Mail',
      '{{received_date}}': receivedDate,
      '{{mailbox_number}}': mailboxNumber,
      '{{quantity}}': mailItem.quantity?.toString() || '1',
      '{{tracking_number}}': mailItem.tracking_number || 'N/A',
    };

    // Apply replacements
    Object.entries(replacements).forEach(([key, value]) => {
      subjectPreview = subjectPreview.replace(new RegExp(key, 'g'), value);
      messagePreview = messagePreview.replace(new RegExp(key, 'g'), value);
    });

    setSubject(subjectPreview);
    setMessage(messagePreview);
    setIsEditing(false);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.template_id === templateId);
    if (template) {
      previewTemplate(template);
    }
  };

  const handleSend = async () => {
    if (!currentEmail) {
      toast.error('This customer does not have an email address on file');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await api.emails.sendCustom({
        to: currentEmail,
        subject: subject,
        body: message,
        contact_id: mailItem.contacts?.contact_id,
        mail_item_id: mailItem.mail_item_id,
        template_id: selectedTemplateId || undefined
      });

      toast.success(`Email sent to ${currentEmail}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      // Handle specific error codes from backend
      const errorResponse = error.response?.data;
      
      if (errorResponse?.code === 'GMAIL_DISCONNECTED' || errorResponse?.code === 'EMAIL_NOT_CONFIGURED') {
        // Show user-friendly error with action button
        toast.error(
          (t) => (
            <div className="flex flex-col gap-2">
              <div className="font-semibold">Gmail Disconnected</div>
              <div className="text-sm">{errorResponse.message}</div>
              <a
                href="/dashboard/settings"
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 text-center"
                onClick={() => toast.dismiss(t.id)}
              >
                Go to Settings →
              </a>
            </div>
          ),
          { duration: 8000 }
        );
      } else {
        // Generic error
        toast.error(errorResponse?.message || error.message || 'Failed to send email');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Send Email Notification</h2>
              {currentEmail ? (
                <p className="text-sm text-gray-600">
                  To: {currentEmail}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-red-600">No email on file</p>
                  {mailItem.contacts?.contact_id && (
                    <button
                      onClick={handleEditContact}
                      className="text-sm text-blue-600 hover:text-blue-700 underline cursor-pointer"
                    >
                      Add email →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : !currentEmail ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Email Address</h3>
              <p className="text-gray-600 mb-4 max-w-md">
                This customer doesn't have an email address on file. Please add one to send emails.
              </p>
              {mailItem.contacts?.contact_id && (
                <button
                  onClick={handleEditContact}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Customer Info
                </button>
              )}
              <button
                onClick={loadLatestContactEmail}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                I just added it, refresh →
              </button>
            </div>
          ) : (
            <>
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  {templates.map(template => (
                    <option key={template.template_id} value={template.template_id}>
                      {template.template_name} ({template.template_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {mailItem.contacts?.contact_person || mailItem.contacts?.company_name || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Mailbox:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {mailItem.contacts?.mailbox_number || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Mail Type:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {mailItem.item_type || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Received:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {new Date(mailItem.received_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  placeholder="Email subject..."
                />
              </div>

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {isEditing ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Preview
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </>
                    )}
                  </button>
                </div>
                {isEditing ? (
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    disabled={loading}
                    placeholder="Email message..."
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 whitespace-pre-wrap text-sm text-gray-800 min-h-[200px]">
                    {message}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {!currentEmail && (
              <button
                onClick={loadLatestContactEmail}
                disabled={loading}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4" />
                Refresh Email
              </button>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={loading || loadingTemplates || !currentEmail}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

