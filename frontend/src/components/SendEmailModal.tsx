import React, { useState, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Mail, ChevronDown } from 'lucide-react';
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
  notification_count?: number;
  last_notified?: string;
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
  suggestedTemplateType?: string;
}

export default function SendEmailModal({ isOpen, onClose, mailItem, onSuccess, suggestedTemplateType }: SendEmailModalProps) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadLatestContactEmail = useCallback(async () => {
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
  }, [mailItem.contacts?.contact_id, mailItem.contacts?.email]);

  const handleEditContact = () => {
    if (mailItem.contacts?.contact_id) {
      const customerName = mailItem.contacts?.contact_person || mailItem.contacts?.company_name || 'the customer';
      onClose();
      navigate(`/dashboard/contacts/${mailItem.contacts.contact_id}`);
      toast.success(`Viewing ${customerName}'s profile. Click "Edit Contact" to add their email.`, { duration: 6000, icon: '📝' });
    }
  };

  const previewTemplate = useCallback((template: Template) => {
    const customerName = mailItem.contacts?.contact_person || mailItem.contacts?.company_name || 'Customer';
    const mailboxNumber = mailItem.contacts?.mailbox_number || 'N/A';
    const receivedDate = new Date(mailItem.received_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let subjectPreview = template.subject_line || 'Mail Notification';
    let messagePreview = template.message_body || '';

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

    Object.entries(replacements).forEach(([key, value]) => {
      subjectPreview = subjectPreview.replace(new RegExp(key, 'g'), value);
      messagePreview = messagePreview.replace(new RegExp(key, 'g'), value);
    });

    setSubject(subjectPreview);
    setMessage(messagePreview);
  }, [mailItem.contacts?.contact_person, mailItem.contacts?.company_name, mailItem.contacts?.mailbox_number, mailItem.item_type, mailItem.received_date, mailItem.quantity, mailItem.tracking_number]);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await api.templates.getAll();
      setTemplates(response.templates || []);
      
      const notificationCount = mailItem.notification_count || 0;
      // Auto-select template based on notification count OR suggested type
      let templateTypeToSelect: string;
      
      // Use suggestedTemplateType if provided (from Dashboard context-aware logic)
      if (suggestedTemplateType) {
        templateTypeToSelect = suggestedTemplateType;
      } else if (notificationCount === 0) {
        templateTypeToSelect = "Initial";
      } else if (notificationCount === 1) {
        templateTypeToSelect = "Reminder";
      } else {
        templateTypeToSelect = "Final";
      }

      if (response.templates && response.templates.length > 0) {
        let templateToSelect = response.templates[0];
        
        // Try to find exact match by template_name first (for specific templates like "Package Fee Reminder")
        const foundByName = response.templates.find((t: Template) => 
          t.template_name === templateTypeToSelect
        );
        
        // Fall back to matching by template_type
        const foundByType = response.templates.find((t: Template) => 
          t.template_type === templateTypeToSelect
        );
        
        if (foundByName) {
          templateToSelect = foundByName;
        } else if (foundByType) {
          templateToSelect = foundByType;
        }
        
        setSelectedTemplateId(templateToSelect.template_id);
        previewTemplate(templateToSelect);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, [mailItem.notification_count, previewTemplate]);

  useEffect(() => {
    if (isOpen) {
      void loadTemplates(); // Explicitly ignore the promise
      void loadLatestContactEmail(); // Explicitly ignore the promise
    }
  }, [isOpen, suggestedTemplateType, loadTemplates, loadLatestContactEmail]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t: Template) => t.template_id === templateId);
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
      await api.emails.sendWithTemplate({
        contact_id: mailItem.contacts?.contact_id || '',
        template_id: selectedTemplateId,
        mail_item_id: mailItem.mail_item_id,
        message_type: templates.find((t: Template) => t.template_id === selectedTemplateId)?.template_type || 'Initial'
      });

      toast.success(`Email sent to ${currentEmail}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      const errorResponse = error.response?.data;
      
      if (errorResponse?.code === 'GMAIL_DISCONNECTED' || errorResponse?.code === 'EMAIL_NOT_CONFIGURED') {
        toast.error(
          (t: { id: string }) => (
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
        toast.error(errorResponse?.message || error.message || 'Failed to send email');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const customerName = mailItem.contacts?.contact_person || mailItem.contacts?.company_name || 'Customer';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* Gmail-style Header - Minimal */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="text-base font-medium text-gray-900">New Message</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Notification History Banner - Compact */}
        {(mailItem.notification_count ?? 0) > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-sm">
            <span className="font-semibold text-amber-700">⚠️</span>
            <span className="text-amber-800">
              Previously notified {mailItem.notification_count} time{mailItem.notification_count !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Content - Gmail-style */}
        <div className="flex-1 overflow-y-auto">
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : !currentEmail ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Mail className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Email Address</h3>
              <p className="text-gray-600 mb-4">
                {customerName} doesn't have an email address on file.
              </p>
              {mailItem.contacts?.contact_id && (
                <button
                  onClick={handleEditContact}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Add Email Address
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* To Field - Gmail style */}
              <div className="flex items-center px-4 py-3 hover:bg-gray-50">
                <span className="text-sm text-gray-500 w-16 flex-shrink-0">To</span>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-gray-900">{currentEmail}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {customerName}
                  </span>
                </div>
              </div>

              {/* Template Selector - Compact */}
              <div className="flex items-center px-4 py-3 hover:bg-gray-50">
                <span className="text-sm text-gray-500 w-16 flex-shrink-0">Template</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="flex-1 text-sm border-none focus:ring-0 focus:outline-none text-gray-900 bg-transparent"
                  disabled={loading}
                >
                  {templates.map(template => (
                    <option key={template.template_id} value={template.template_id}>
                      {template.template_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject - Gmail style */}
              <div className="px-4 py-3">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-sm border-none focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-400"
                  disabled={loading}
                  placeholder="Subject"
                />
              </div>

              {/* Message Body - Gmail style */}
              <div className="p-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full h-[280px] text-sm border-none focus:ring-0 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
                  disabled={loading}
                  placeholder="Compose email..."
                />
              </div>

              {/* Mail Details - Collapsible */}
              <div className="px-4 py-2 bg-gray-50">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 w-full"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  <span>Mail Details</span>
                </button>
                {showDetails && (
                  <div className="mt-2 space-y-1 text-xs text-gray-600 pl-5">
                    <div>Mailbox: {mailItem.contacts?.mailbox_number || 'N/A'}</div>
                    <div>Type: {mailItem.item_type} (Qty: {mailItem.quantity || 1})</div>
                    <div>Received: {new Date(mailItem.received_date).toLocaleDateString()}</div>
                    {mailItem.tracking_number && <div>Tracking: {mailItem.tracking_number}</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Gmail style with Send button */}
        {currentEmail && !loadingTemplates && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-white">
            <button
              onClick={handleSend}
              disabled={loading || !subject.trim() || !message.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </button>
            
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {(mailItem.notification_count ?? 0) > 0 && (
                <span>
                  {mailItem.notification_count === 1 ? 'Reminder' : mailItem.notification_count === 2 ? 'Final Notice' : 'Follow-up'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
