'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function SendMessagePage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;

  const [contact, setContact] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [messageType, setMessageType] = useState('Initial');
  const [channel, setChannel] = useState('Email');
  const [subject, setSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedMailItem, setSelectedMailItem] = useState('');
  const [mailItems, setMailItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [contactId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch contact details
      const contactRes = await fetch(`/api/contacts/${contactId}`);
      if (contactRes.ok) {
        const contactData = await contactRes.json();
        setContact(contactData);
      }

      // Fetch message templates
      const templatesRes = await fetch('/api/templates');
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(Array.isArray(templatesData) ? templatesData : []);
      }

      // Fetch mail items for this contact
      const mailItemsRes = await fetch(`/api/mail-items?contact_id=${contactId}`);
      if (mailItemsRes.ok) {
        const mailItemsData = await mailItemsRes.json();
        setMailItems(Array.isArray(mailItemsData) ? mailItemsData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);

    if (templateId) {
      const template = templates.find(t => t.template_id === templateId);
      if (template) {
        setMessageType(template.template_type || 'Initial');
        setChannel(template.default_channel || 'Email');
        setSubject(template.subject_line || '');
        setMessageContent(template.message_body || '');
      }
    }
  };

  const replaceVariables = (text: string) => {
    if (!contact) return text;
    
    return text
      .replace(/\{\{contact_name\}\}/g, contact.contact_person || contact.company_name || '')
      .replace(/\{\{company_name\}\}/g, contact.company_name || '')
      .replace(/\{\{unit_number\}\}/g, contact.unit_number || '');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageContent.trim()) {
      alert('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/outreach-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_id: contactId,
          mail_item_id: selectedMailItem || null,
          message_type: messageType,
          channel: channel,
          subject_line: subject,
          message_content: replaceVariables(messageContent),
          responded: false,
        }),
      });

      if (response.ok) {
        alert('Message sent successfully!');
        router.push(`/dashboard/contacts/${contactId}`);
      } else {
        const error = await response.json();
        alert(`Failed to send message: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">📧</div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-zinc-400">Contact not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-zinc-400 hover:text-white mb-4 flex items-center gap-2"
        >
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white mb-2">Send Message</h1>
        <p className="text-zinc-400">
          To: {contact.company_name || contact.contact_person} ({contact.unit_number})
        </p>
      </div>

      {/* Message Form */}
      <form onSubmit={handleSendMessage} className="space-y-6">
        {/* Template Selection */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <label className="block text-sm font-medium text-white mb-2">
            Use Template (Optional)
          </label>
          <select
            value={selectedTemplate}
            onChange={handleTemplateSelect}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">-- Select a template --</option>
            {templates.map((template) => (
              <option key={template.template_id} value={template.template_id}>
                {template.template_name}
              </option>
            ))}
          </select>
        </div>

        {/* Message Details */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
          {/* Mail Item (Optional) */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Related Mail Item (Optional)
            </label>
            <select
              value={selectedMailItem}
              onChange={(e) => setSelectedMailItem(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">-- No specific mail item --</option>
              {mailItems.map((item) => (
                <option key={item.mail_item_id} value={item.mail_item_id}>
                  {item.item_type} - {item.description} ({new Date(item.received_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Message Type *
            </label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Initial">Initial Notification</option>
              <option value="Reminder">Reminder</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Confirmation">Confirmation</option>
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Channel *
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="SMS">SMS</option>
              <option value="WeChat">WeChat</option>
            </select>
          </div>

          {/* Subject (for Email) */}
          {channel === 'Email' && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Enter email subject"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}

          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Message Content *
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              required
              rows={10}
              placeholder="Enter your message here..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Variables: {'{'}{'{'} contact_name {'}'}{'}'},  {'{'}{'{'} company_name {'}'}{'}'},  {'{'}{'{'} unit_number {'}'}{'}'} will be replaced automatically
            </p>
          </div>
        </div>

        {/* Preview */}
        {messageContent && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Preview</h3>
            {channel === 'Email' && subject && (
              <div className="mb-3">
                <span className="text-sm text-zinc-400">Subject: </span>
                <span className="text-white">{replaceVariables(subject)}</span>
              </div>
            )}
            <div className="bg-zinc-800 border border-zinc-700 rounded p-4 text-zinc-300 whitespace-pre-wrap">
              {replaceVariables(messageContent)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            variant="slim"
            disabled={sending}
          >
            {sending ? 'Sending...' : '📧 Send Message'}
          </Button>
          <Button
            type="button"
            variant="flat"
            onClick={() => router.back()}
            disabled={sending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

