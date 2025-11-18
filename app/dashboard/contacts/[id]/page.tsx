'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import type { Contact } from '@/types/mei-way';

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [mailItems, setMailItems] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contactId) {
      loadContactData();
    }
  }, [contactId]);

  const loadContactData = async () => {
    try {
      // Load contact details
      const contactRes = await fetch(`/api/contacts/${contactId}`);
      if (contactRes.ok) {
        const contactData = await contactRes.json();
        setContact(contactData);
      }

      // Load mail items for this contact
      const mailRes = await fetch(`/api/mail-items?contact_id=${contactId}`);
      if (mailRes.ok) {
        const mailData = await mailRes.json();
        setMailItems(Array.isArray(mailData) ? mailData : []);
      }

      // Load messages for this contact
      const messagesRes = await fetch(`/api/messages?contact_id=${contactId}`);
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(Array.isArray(messagesData) ? messagesData : []);
      }
    } catch (err) {
      console.error('Error loading contact data:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      Active: 'bg-green-500/20 text-green-400 border-green-500/30',
      PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      No: 'bg-red-500/20 text-red-400 border-red-500/30',
      Received: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      Notified: 'bg-green-500/20 text-green-400 border-green-500/30',
      'Picked Up': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      Returned: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-700 rounded w-48"></div>
          <div className="h-64 bg-zinc-900 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-white mb-2">Contact Not Found</h2>
          <p className="text-zinc-400 mb-6">The contact you're looking for doesn't exist.</p>
          <Button variant="slim" onClick={() => router.push('/dashboard/contacts')}>
            Back to Contacts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
        >
          ← Back to Contacts
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {contact.company_name || contact.contact_person || `Unit ${contact.unit_number}`}
            </h1>
            <div className="flex items-center gap-3">
              <StatusBadge status={contact.status} />
              <span className="text-zinc-400">Unit {contact.unit_number}</span>
              {contact.mailbox_number && (
                <span className="text-zinc-400">• Mailbox {contact.mailbox_number}</span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="slim" onClick={() => router.push(`/dashboard/contacts/${contactId}/message`)}>
              📧 Send Message
            </Button>
            <Button variant="slim" onClick={() => router.push(`/dashboard/contacts/${contactId}/edit`)}>
              ✏️ Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Contact Information</h2>
            <div className="space-y-4">
              {contact.contact_person && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Contact Person</p>
                  <p className="text-white">{contact.contact_person}</p>
                </div>
              )}
              {contact.company_name && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Company</p>
                  <p className="text-white">{contact.company_name}</p>
                </div>
              )}
              {contact.email && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Email</p>
                  <a href={`mailto:${contact.email}`} className="text-blue-400 hover:text-blue-300">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone_number && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Phone</p>
                  <a href={`tel:${contact.phone_number}`} className="text-blue-400 hover:text-blue-300">
                    {contact.phone_number}
                  </a>
                </div>
              )}
              {contact.language_preference && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Language</p>
                  <p className="text-white">{contact.language_preference}</p>
                </div>
              )}
              {contact.service_tier && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Service Tier</p>
                  <p className="text-white">Tier {contact.service_tier}</p>
                </div>
              )}
              {contact.options && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-1">Notes</p>
                  <p className="text-white">{contact.options}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mail Items & Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mail Items */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Mail Items History</h2>
              <span className="text-sm text-zinc-400">{mailItems.length} items</span>
            </div>
            {mailItems.length > 0 ? (
              <div className="space-y-2">
                {mailItems.map(item => (
                  <div 
                    key={item.mail_item_id}
                    className="flex justify-between items-center p-4 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.item_type}</p>
                      {item.description && (
                        <p className="text-sm text-zinc-400">{item.description}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatDate(item.received_date)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-400">No mail items yet</p>
              </div>
            )}
          </div>

          {/* Communication History */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Communication History</h2>
              <span className="text-sm text-zinc-400">{messages.length} messages</span>
            </div>
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map(message => (
                  <div 
                    key={message.message_id}
                    className="border-l-2 border-blue-500 pl-4 py-2"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{message.message_type}</span>
                      <span className="text-xs text-zinc-500">via {message.channel}</span>
                      {message.responded && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                          ✓ Responded
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 mb-1">{message.message_content}</p>
                    <p className="text-xs text-zinc-500">{formatDate(message.sent_at)}</p>
                    {message.notes && (
                      <p className="text-xs text-zinc-400 mt-1 italic">Note: {message.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-400">No messages sent yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

