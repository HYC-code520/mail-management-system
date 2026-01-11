import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Package, ChevronRight, Send, Edit, MoreVertical, Pencil, Trash2, Check, FileText, CircleCheckBig, TriangleAlert, Loader2 } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import SendEmailModal from '../components/SendEmailModal.tsx';
import CollectFeeModal from '../components/CollectFeeModal.tsx';
import ActionHistorySection from '../components/ActionHistorySection.tsx';
import ActionModal from '../components/ActionModal.tsx';
import Modal from '../components/Modal.tsx';
import { validateContactForm } from '../utils/validation.ts';
import toast from 'react-hot-toast';
import { getCustomerAvatarUrl } from '../utils/customerAvatars.ts';
import { formatNYDateDisplay } from '../utils/timezone.ts';

// Helper function to generate avatar color based on name
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-teal-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Helper function to get initials from name
const getInitials = (name: string): string => {
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

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
  created_at?: string;
  display_name_preference?: 'company' | 'person' | 'both';
}

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  pickup_date?: string;
  description?: string;
  quantity?: number;
  tracking_number?: string;
  contact_id?: string;
  contacts?: {
    contact_id?: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
    email?: string;
    phone_number?: string;
  };
}

interface NotificationHistory {
  notification_id: string;
  notified_by: string;
  notification_method: string;
  notified_at: string;
  notes?: string;
}

interface UnpaidFee {
  fee_id: string;
  mail_item_id: string;
  fee_amount: number;
  days_charged: number;
  fee_status: 'pending' | 'paid' | 'waived';
  created_at: string;
  isDebt: boolean; // True if picked up without paying
  mail_items?: {
    mail_item_id: string;
    item_type: string;
    received_date: string;
    status: string;
    pickup_date?: string;
  };
}

interface GroupedMailItem {
  groupKey: string; // e.g., "2024-12-11_Letter"
  itemType: string;
  receivedDate: string; // Date part only (YYYY-MM-DD)
  totalQuantity: number;
  items: MailItem[]; // All individual mail items in this group
  latestStatus: string;
  latestDescription?: string;
}

// Helper function to group mail items by date and type
const groupMailItems = (items: MailItem[]): GroupedMailItem[] => {
  const grouped = new Map<string, GroupedMailItem>();

  items.forEach(item => {
    // Format date to YYYY-MM-DD in NY timezone
    const receivedDateDay = new Date(item.received_date).toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    }); // en-CA gives YYYY-MM-DD format

    const groupKey = `${receivedDateDay}_${item.item_type}`;

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        groupKey,
        itemType: item.item_type,
        receivedDate: receivedDateDay,
        totalQuantity: 0,
        items: [],
        latestStatus: '',
        latestDescription: undefined,
      });
    }

    const group = grouped.get(groupKey)!;
    group.items.push(item);
    group.totalQuantity += item.quantity || 1;

    // Use the most recent item's status and description
    const currentItemTimestamp = new Date(item.received_date).getTime();
    const existingLatestTimestamp = group.items.length > 1 
      ? new Date(group.items[group.items.length - 2].received_date).getTime() 
      : 0;

    if (currentItemTimestamp >= existingLatestTimestamp) {
      group.latestStatus = item.status;
      group.latestDescription = item.description;
    }
  });

  // Sort items within each group by received_date (oldest first)
  grouped.forEach(group => {
    group.items.sort((a, b) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime());
  });

  // Return groups sorted by date (most recent first)
  return Array.from(grouped.values()).sort((a, b) => 
    new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
  );
};

export default function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [mailHistory, setMailHistory] = useState<MailItem[]>([]);
  const [groupedMailHistory, setGroupedMailHistory] = useState<GroupedMailItem[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<Record<string, NotificationHistory[]>>({});
  const [actionHistory, setActionHistory] = useState<Record<string, any[]>>({});
  const [loadingActionHistory, setLoadingActionHistory] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [unpaidFees, setUnpaidFees] = useState<UnpaidFee[]>([]);
  
  // Send Email Modal states
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [emailingMailItem, setEmailingMailItem] = useState<MailItem | null>(null);
  const [emailGroupItems, setEmailGroupItems] = useState<MailItem[]>([]);
  
  // Collect Fee Modal state
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);

  // Action Modal states (for Mark as Picked Up, Scanned, etc.)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'picked_up' | 'forward' | 'scanned' | 'abandoned'>('picked_up');
  const [actionMailItem, setActionMailItem] = useState<MailItem | null>(null);
  const [actionGroupItems, setActionGroupItems] = useState<MailItem[]>([]);

  // Three-dot menu state
  const [openMenuGroupKey, setOpenMenuGroupKey] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete state
  const [deletingGroupKey, setDeletingGroupKey] = useState<string | null>(null);

  // Edit Mail Item Modal states
  const [isEditMailModalOpen, setIsEditMailModalOpen] = useState(false);
  const [editingMailItem, setEditingMailItem] = useState<MailItem | null>(null);
  const [editingGroupItems, setEditingGroupItems] = useState<MailItem[]>([]);
  const [editMailFormData, setEditMailFormData] = useState({
    item_type: 'Letter',
    quantity: 1,
    description: ''
  });
  const [savingMailEdit, setSavingMailEdit] = useState(false);

  // Bulk pickup modal state
  const [isBulkPickupModalOpen, setIsBulkPickupModalOpen] = useState(false);
  const [bulkPickupPerformedBy, setBulkPickupPerformedBy] = useState('');
  const [processingBulkPickup, setProcessingBulkPickup] = useState(false);
  
  // Edit Contact Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    contact_person: '',
    company_name: '',
    mailbox_number: '',
    unit_number: '',
    email: '',
    phone_number: '',
    language_preference: 'English',
    service_tier: 1,
    status: 'Pending',
    display_name_preference: 'both'
  });

  const loadContactDetails = useCallback(async () => {
    try {
      const data = await api.contacts.getById(id!);
      setContact(data);
    } catch (err) {
      console.error('Error loading contact:', err);
      toast.error('Failed to load contact details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMailHistory = useCallback(async () => {
    try {
      const data = await api.mailItems.getAll(id);
      const items = Array.isArray(data) ? data : [];
      setMailHistory(items);
      setGroupedMailHistory(groupMailItems(items));
    } catch (err) {
      console.error('Error loading mail history:', err);
    }
  }, [id]);

  const loadUnpaidFees = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.fees.getUnpaidByContact(id);
      setUnpaidFees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading unpaid fees:', err);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void loadContactDetails(); // Explicitly ignore the promise
      void loadMailHistory(); // Explicitly ignore the promise
      void loadUnpaidFees(); // Load unpaid fees
    }
  }, [id, loadContactDetails, loadMailHistory, loadUnpaidFees]);

  // Load action history for all items in a group (combined)
  const loadActionHistoryForGroup = async (groupKey: string, mailItemIds: string[]) => {
    try {
      // Set loading state
      setLoadingActionHistory(prev => new Set(prev).add(groupKey));

      const historyPromises = mailItemIds.map(id => api.actionHistory.getByMailItem(id));
      const histories = await Promise.all(historyPromises);

      // Combine and sort by timestamp
      const combinedHistory = histories.flat().sort((a, b) =>
        new Date(a.action_timestamp).getTime() - new Date(b.action_timestamp).getTime()
      );

      setActionHistory(prev => ({
        ...prev,
        [groupKey]: combinedHistory
      }));
    } catch (err) {
      console.error('Error loading action history for group:', err);
    } finally {
      // Clear loading state
      setLoadingActionHistory(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupKey);
        return newSet;
      });
    }
  };

  // Load notification history for all items in a group (combined)
  const loadNotificationHistoryForGroup = async (groupKey: string, mailItemIds: string[]) => {
    try {
      const historyPromises = mailItemIds.map(id => api.notifications.getByMailItem(id));
      const histories = await Promise.all(historyPromises);
      
      // Combine and sort by timestamp
      const combinedHistory = histories.flat().sort((a, b) => 
        new Date(a.notified_at).getTime() - new Date(b.notified_at).getTime()
      );

      setNotificationHistory(prev => ({
        ...prev,
        [groupKey]: combinedHistory
      }));
    } catch (err) {
      console.error('Error loading notification history for group:', err);
    }
  };

  const toggleRow = (groupKey: string, mailItemIds: string[]) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
      // Load both notification and action history for all items in the group
      if (!notificationHistory[groupKey]) {
        loadNotificationHistoryForGroup(groupKey, mailItemIds);
      }
      if (!actionHistory[groupKey]) {
        loadActionHistoryForGroup(groupKey, mailItemIds);
      }
    }
    setExpandedRows(newExpanded);
  };

  const openSendEmailModal = (item: MailItem, groupItems?: MailItem[]) => {
    // Attach contact info to mail item if not already there
    if (!item.contacts && contact) {
      item.contacts = {
        contact_id: contact.contact_id,
        contact_person: contact.contact_person,
        company_name: contact.company_name,
        mailbox_number: contact.mailbox_number,
        email: contact.email,
        phone_number: contact.phone_number
      };
      item.contact_id = contact.contact_id;
    }
    setEmailingMailItem(item);
    setEmailGroupItems(groupItems || [item]);
    setIsSendEmailModalOpen(true);
  };

  const handleEmailSuccess = () => {
    loadMailHistory(); // Refresh mail history after email sent
    setIsSendEmailModalOpen(false);
    setEmailingMailItem(null);
    setEmailGroupItems([]);
  };

  // Click outside handler for three-dot menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuGroupKey(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open action modal
  const openActionModal = (type: 'picked_up' | 'forward' | 'scanned' | 'abandoned', item: MailItem, groupItems: MailItem[]) => {
    setActionType(type);
    setActionMailItem(item);
    setActionGroupItems(groupItems);
    setIsActionModalOpen(true);
    setOpenMenuGroupKey(null);
  };

  // Handle delete for all items in a group
  const handleDelete = async (groupItems: MailItem[], groupKey: string) => {
    const itemCount = groupItems.length;
    const totalQty = groupItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

    if (!confirm(`Are you sure you want to delete ${itemCount > 1 ? `all ${itemCount} entries (${totalQty} items)` : 'this mail item'}?`)) {
      return;
    }

    setDeletingGroupKey(groupKey);
    try {
      for (const item of groupItems) {
        await api.mailItems.delete(item.mail_item_id);
      }
      toast.success(itemCount > 1
        ? `Deleted ${itemCount} entries (${totalQty} items)`
        : 'Mail item deleted');
      loadMailHistory();
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete mail item(s)');
    } finally {
      setDeletingGroupKey(null);
      setOpenMenuGroupKey(null);
    }
  };

  // Open edit mail modal
  const openEditMailModal = (item: MailItem, groupItems: MailItem[], groupTotalQuantity: number) => {
    setEditingMailItem(item);
    setEditingGroupItems(groupItems);
    setEditMailFormData({
      item_type: item.item_type || 'Letter',
      quantity: groupTotalQuantity,
      description: item.description || ''
    });
    setIsEditMailModalOpen(true);
    setOpenMenuGroupKey(null);
  };

  // Handle edit mail submit
  const handleEditMailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMailItem || !editingGroupItems.length) return;

    setSavingMailEdit(true);
    try {
      const newTotalQuantity = editMailFormData.quantity;
      const oldTotalQuantity = editingGroupItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

      if (editingGroupItems.length === 1) {
        // Single item - just update it
        await api.mailItems.update(editingMailItem.mail_item_id, {
          item_type: editMailFormData.item_type,
          quantity: newTotalQuantity,
          description: editMailFormData.description || null
        });
      } else {
        // Multiple items - consolidate into one and delete the rest
        await api.mailItems.update(editingGroupItems[0].mail_item_id, {
          item_type: editMailFormData.item_type,
          quantity: newTotalQuantity,
          description: editMailFormData.description || null
        });

        // Delete the other items in the group
        for (let i = 1; i < editingGroupItems.length; i++) {
          await api.mailItems.delete(editingGroupItems[i].mail_item_id);
        }
      }

      toast.success('Mail item updated successfully');
      setIsEditMailModalOpen(false);
      setEditingMailItem(null);
      setEditingGroupItems([]);
      loadMailHistory();
    } catch (err) {
      console.error('Failed to update mail item:', err);
      toast.error('Failed to update mail item');
    } finally {
      setSavingMailEdit(false);
    }
  };

  // Handle bulk pickup - mark all pending items as picked up
  const handleBulkPickup = async () => {
    if (!bulkPickupPerformedBy) {
      toast.error('Please select who performed this action');
      return;
    }

    setProcessingBulkPickup(true);
    try {
      const pendingItems = mailHistory.filter(item =>
        item.status !== 'Picked Up' && item.status !== 'Abandoned Package'
      );

      for (const item of pendingItems) {
        await api.mailItems.update(item.mail_item_id, {
          status: 'Picked Up',
          performed_by: bulkPickupPerformedBy
        });
      }

      const totalQty = pendingItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      toast.success(`Marked ${totalQty} items as picked up`);
      setIsBulkPickupModalOpen(false);
      setBulkPickupPerformedBy('');
      loadMailHistory();
    } catch (err) {
      console.error('Failed to process bulk pickup:', err);
      toast.error('Failed to mark items as picked up');
    } finally {
      setProcessingBulkPickup(false);
    }
  };

  // Calculate pending items for bulk pickup
  const pendingItems = mailHistory.filter(item =>
    item.status !== 'Picked Up' && item.status !== 'Abandoned Package'
  );
  const pendingLetters = pendingItems.filter(i => i.item_type === 'Letter').reduce((sum, i) => sum + (i.quantity || 1), 0);
  const pendingPackages = pendingItems.filter(i => i.item_type === 'Package' || i.item_type === 'Large Package').reduce((sum, i) => sum + (i.quantity || 1), 0);

  // Format phone number as user types: 917-822-5751
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limitedDigits = digits.slice(0, 10);
    
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    } else if (limitedDigits.length <= 6) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    } else {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
  };

  const openEditModal = () => {
    if (!contact) return;
    
    setFormData({
      contact_person: contact.contact_person || '',
      company_name: contact.company_name || '',
      mailbox_number: contact.mailbox_number || '',
      unit_number: contact.unit_number || '',
      email: contact.email || '',
      phone_number: contact.phone_number || '',
      language_preference: contact.language_preference || 'English',
      service_tier: contact.service_tier || 1,
      status: contact.status || 'Pending',
      display_name_preference: contact.display_name_preference || 'auto'
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setFormData({
      contact_person: '',
      company_name: '',
      mailbox_number: '',
      unit_number: '',
      email: '',
      phone_number: '',
      language_preference: 'English',
      service_tier: 1,
      status: 'Pending',
      display_name_preference: 'both'
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone_number') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'service_tier' ? parseInt(value) : value
      }));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateContactForm(formData);
    
    if (!validation.isValid) {
      if (validation.errors.general) {
        toast.error(validation.errors.general);
      }
      
      Object.entries(validation.errors).forEach(([field, error]) => {
        if (field !== 'general') {
          const fieldName = field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          toast.error(`${fieldName}: ${error}`);
        }
      });
      
      return;
    }

    if (!formData.mailbox_number) {
      toast.error('Mailbox number is required');
      return;
    }

    setSaving(true);

    try {
      await api.contacts.update(id!, formData);
      toast.success('Customer updated successfully!');
      closeEditModal();
      loadContactDetails(); // Refresh contact data
    } catch (err: any) {
      console.error('Failed to update contact:', err);
      
      if (err.response?.data?.details) {
        const backendErrors = err.response.data.details;
        Object.entries(backendErrors).forEach(([field, error]) => {
          const fieldName = field.replace('_', ' ').replace(/\b\w/g, l => (l as string).toUpperCase());
          toast.error(`${fieldName}: ${error}`);
        });
      } else {
        toast.error(`Failed to update customer: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-full mx-auto px-16 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="max-w-full mx-auto px-16 py-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Contact not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-16 py-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/contacts')}
        className="flex items-center gap-2 text-gray-900 hover:text-gray-700 mb-4 sm:mb-6 font-medium text-sm sm:text-base"
      >
        <span>←</span>
        <span>Back to Directory</span>
      </button>

      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {(() => {
            const customAvatar = getCustomerAvatarUrl(
              contact.contact_id,
              contact.mailbox_number,
              contact.contact_person,
              contact.company_name
            );
            
            if (customAvatar) {
              return (
                <img
                  src={customAvatar}
                  alt={contact.contact_person || contact.company_name || 'Contact'}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg"
                />
              );
            }
            
            return (
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${getAvatarColor(contact.contact_person || contact.company_name || 'U')} flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg`}>
                {getInitials(contact.contact_person || contact.company_name || 'UN')}
              </div>
            );
          })()}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {contact.contact_person || contact.company_name || 'Unnamed Contact'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Customer Profile</p>
          </div>
        </div>
        <button
          onClick={openEditModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <Edit className="w-4 h-4" />
          Edit Contact
        </button>
      </div>

      {/* Two Column Layout - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Contact Information */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm h-fit">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Contact Information</h2>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Name */}
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Name</p>
              <p className="text-sm sm:text-base text-gray-900 font-medium break-words">{contact.contact_person || '—'}</p>
            </div>

            {/* Company */}
            {contact.company_name && (
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Company</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium break-words">{contact.company_name}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                <p className="text-sm sm:text-base text-gray-900 break-all">{contact.email || '—'}</p>
              </div>
            </div>

            {/* Phone */}
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Phone</p>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base">📞</span>
                <p className="text-sm sm:text-base text-gray-900">{contact.phone_number || '—'}</p>
              </div>
            </div>

            {/* Mailbox # */}
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Mailbox #</p>
              <p className="text-sm sm:text-base text-gray-900 font-medium">{contact.mailbox_number || '—'}</p>
            </div>

            {/* Unit # */}
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Unit #</p>
              <p className="text-sm sm:text-base text-gray-900 font-medium">{contact.unit_number || '—'}</p>
            </div>

            {/* Service Tier */}
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Service Tier</p>
              <p className="text-sm sm:text-base text-gray-900 font-medium">{contact.service_tier || '1'}</p>
            </div>

            {/* Language */}
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Language</p>
              <p className="text-sm sm:text-base text-gray-900 font-medium">{contact.language_preference || 'English'}</p>
            </div>

            {/* Subscription Status */}
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Status</p>
              <span className={`inline-block px-2 sm:px-3 py-1 rounded text-xs font-medium ${
                contact.status === 'Active' ? 'bg-green-100 text-green-700' :
                contact.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                contact.status === 'No' ? 'bg-gray-100 text-gray-700' :
                'bg-gray-200 text-gray-700'
              }`}>
                {contact.status || 'PENDING'}
              </span>
            </div>

            {/* Customer Since */}
            {contact.created_at && (
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Customer Since</p>
                <p className="text-sm sm:text-base text-gray-900 font-medium">
                  {formatNYDateDisplay(contact.created_at, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            )}
          </div>
          
          {/* Unpaid Fees Section */}
          {unpaidFees.length > 0 && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="text-orange-600">💰</span>
                Outstanding Fees
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {unpaidFees.map(fee => {
                  const receivedDate = fee.mail_items?.received_date 
                    ? formatNYDateDisplay(fee.mail_items.received_date, {
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Unknown';
                  
                  return (
                    <div 
                      key={fee.fee_id} 
                      className={`p-2 sm:p-3 rounded-lg border ${
                        fee.isDebt 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            📦 Package from {receivedDate}
                          </p>
                          <p className="text-xs text-gray-600">
                            {fee.days_charged} days • {fee.mail_items?.status || 'Pending'}
                          </p>
                          {fee.isDebt && (
                            <p className="text-xs text-red-600 font-medium mt-1">
                              ⚠️ Picked up without paying
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-base sm:text-lg font-bold ${
                            fee.isDebt ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            ${fee.fee_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Total */}
                <div className="pt-2 sm:pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="text-sm sm:text-base font-semibold text-gray-700">Total Outstanding:</p>
                    <p className="text-lg sm:text-xl font-bold text-orange-600">
                      ${unpaidFees.reduce((sum, f) => sum + f.fee_amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Collect Fees Button */}
                <button
                  onClick={() => setIsCollectFeeModalOpen(true)}
                  className="w-full mt-3 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <span>💵</span>
                  <span>Collect Fees</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Mail History */}
        <div className={`lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm ${openMenuGroupKey ? 'overflow-visible' : 'overflow-hidden'}`}>
          <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Mail History</h2>
            {pendingItems.length > 0 && (
              <button
                onClick={() => setIsBulkPickupModalOpen(true)}
                title="Click here when customer is picking up all their pending mail at once"
                className="group px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-all duration-200 flex items-center gap-3 active:scale-[0.98] border border-green-200"
              >
                <div className="flex items-center justify-center w-7 h-7 bg-green-200 rounded-md group-hover:bg-green-300 transition-colors">
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-start text-left leading-none">
                  <span className="text-sm font-semibold">Customer Picking Up All Mail</span>
                  <div className="text-[10px] text-green-600 font-medium flex items-center gap-1.5 mt-0.5">
                    {pendingLetters > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Mail className="w-2.5 h-2.5" /> {pendingLetters}
                      </span>
                    )}
                    {pendingLetters > 0 && pendingPackages > 0 && (
                      <span className="w-1 h-1 bg-green-400 rounded-full" />
                    )}
                    {pendingPackages > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Package className="w-2.5 h-2.5" /> {pendingPackages}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )}
          </div>

          <div className={openMenuGroupKey ? 'overflow-visible' : 'overflow-x-auto'}>
            {mailHistory.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <Mail className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">No mail history yet</p>
                <button
                  onClick={() => navigate(`/dashboard/intake?contactId=${id}`)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Add Mail Item
                </button>
              </div>
            ) : (
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-700 w-10"></th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-700">Qty</th>
                    <th className="text-left py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-right py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedMailHistory.map((group) => (
                    <React.Fragment key={group.groupKey}>
                      {/* Main Grouped Row */}
                      <tr 
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleRow(group.groupKey, group.items.map(i => i.mail_item_id))}
                      >
                        <td className="py-3 sm:py-4 px-3 sm:px-6">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(group.groupKey, group.items.map(i => i.mail_item_id));
                            }}
                            className="text-gray-500 hover:text-gray-700 transition-transform"
                            style={{
                              transform: expandedRows.has(group.groupKey) ? 'rotate(90deg)' : 'rotate(0deg)',
                              display: 'inline-block',
                            }}
                          >
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-900">
                          {formatNYDateDisplay(group.receivedDate, {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-6">
                          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-700">
                            {group.itemType === 'Package' || group.itemType === 'Large Package' ? (
                              <Package className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                            ) : (
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                            )}
                            <span className="truncate">{group.itemType}</span>
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-6">
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm font-medium">
                            {group.totalQuantity}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-6">
                          <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs font-medium whitespace-nowrap ${
                            group.latestStatus === 'Received' ? 'bg-blue-100 text-blue-700' :
                            group.latestStatus === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            group.latestStatus === 'Notified' ? 'bg-purple-100 text-purple-700' :
                            group.latestStatus === 'Picked Up' ? 'bg-green-100 text-green-700' :
                            group.latestStatus === 'Scanned Document' ? 'bg-cyan-100 text-cyan-700' :
                            group.latestStatus === 'Forward' ? 'bg-orange-100 text-orange-700' :
                            group.latestStatus === 'Abandoned Package' ? 'bg-red-100 text-red-700' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {group.latestStatus}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-3 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            {/* Three-dot menu */}
                            <div className="relative" ref={openMenuGroupKey === group.groupKey ? menuRef : null}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuGroupKey(openMenuGroupKey === group.groupKey ? null : group.groupKey);
                                }}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {openMenuGroupKey === group.groupKey && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                                  {/* Send Email - only for non-terminal statuses and if email exists */}
                          {group.latestStatus !== 'Picked Up' && group.latestStatus !== 'Abandoned Package' && contact?.email && (
                            <button
                                      onClick={() => {
                                        openSendEmailModal(group.items[0], group.items);
                                        setOpenMenuGroupKey(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-3"
                            >
                                      <Send className="w-4 h-4 text-blue-600" />
                                      Send Email
                            </button>
                          )}

                                  {/* Edit */}
                                  <button
                                    onClick={() => openEditMailModal(group.items[0], group.items, group.totalQuantity)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    Edit
                                  </button>

                                  {/* Status change actions - only for non-terminal statuses */}
                                  {group.latestStatus !== 'Picked Up' && group.latestStatus !== 'Abandoned Package' && (
                                    <>
                                      <div className="border-t border-gray-100 my-1" />
                                      <button
                                        onClick={() => openActionModal('scanned', group.items[0], group.items)}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-cyan-50 flex items-center gap-3"
                                      >
                                        <FileText className="w-4 h-4 text-cyan-600" />
                                        {group.items.length > 1 ? 'Mark All as Scanned' : 'Mark as Scanned'}
                                      </button>
                                      <button
                                        onClick={() => openActionModal('picked_up', group.items[0], group.items)}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 flex items-center gap-3"
                                      >
                                        <CircleCheckBig className="w-4 h-4 text-green-600" />
                                        {group.items.length > 1 ? 'Mark All as Picked Up' : 'Mark as Picked Up'}
                                      </button>
                                      <button
                                        onClick={() => openActionModal('forward', group.items[0], group.items)}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-3"
                                      >
                                        <Send className="w-4 h-4 text-orange-600" />
                                        {group.items.length > 1 ? 'Mark All as Forward' : 'Mark as Forward'}
                                      </button>
                                      <button
                                        onClick={() => openActionModal('abandoned', group.items[0], group.items)}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 flex items-center gap-3"
                                      >
                                        <TriangleAlert className="w-4 h-4 text-red-600" />
                                        {group.items.length > 1 ? 'Mark All as Abandoned' : 'Mark as Abandoned'}
                                      </button>
                                    </>
                                  )}

                                  {/* Delete */}
                                  <div className="border-t border-gray-100 my-1" />
                                  <button
                                    onClick={() => handleDelete(group.items, group.groupKey)}
                                    disabled={deletingGroupKey === group.groupKey}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 disabled:opacity-50"
                                  >
                                    {deletingGroupKey === group.groupKey ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                    {group.items.length > 1 ? `Delete All (${group.items.length} entries)` : 'Delete'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row - Details & History */}
                      {expandedRows.has(group.groupKey) && (
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <td colSpan={6} className="py-3 sm:py-6 px-3 sm:px-6">
                            <div className="ml-4 sm:ml-10 space-y-4 sm:space-y-6">
                              {/* Action History Section */}
                              <ActionHistorySection
                                actions={actionHistory[group.groupKey] || []}
                                loading={loadingActionHistory.has(group.groupKey)}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      {/* Send Email Modal */}
      {emailingMailItem && (
        <SendEmailModal
          isOpen={isSendEmailModalOpen}
          onClose={() => {
            setIsSendEmailModalOpen(false);
            setEmailingMailItem(null);
            setEmailGroupItems([]);
          }}
          mailItem={emailingMailItem}
          bulkMailItems={emailGroupItems.length > 1 ? emailGroupItems : undefined}
          onSuccess={handleEmailSuccess}
        />
      )}
      
      {/* Collect Fee Modal */}
      {contact && unpaidFees.length > 0 && (
        <CollectFeeModal
          isOpen={isCollectFeeModalOpen}
          onClose={() => setIsCollectFeeModalOpen(false)}
          group={{
            contact: {
              contact_id: contact.contact_id,
              contact_person: contact.contact_person,
              company_name: contact.company_name,
              mailbox_number: contact.mailbox_number
            },
            packages: unpaidFees.map(fee => ({
              mail_item_id: fee.mail_item_id,
              item_type: 'Package',
              received_date: fee.mail_items?.received_date || '',
              status: fee.mail_items?.status || 'Pending',
              packageFee: {
                fee_id: fee.fee_id,
                mail_item_id: fee.mail_item_id,
                fee_amount: fee.fee_amount,
                days_charged: fee.days_charged,
                fee_status: 'pending'
              }
            })),
            letters: [],
            totalFees: unpaidFees.reduce((sum, f) => sum + f.fee_amount, 0),
            urgencyScore: 0
          }}
          onSuccess={(action) => {
            // Refresh data in background
            loadUnpaidFees();
            loadMailHistory();
            // Only close for non-collected actions (celebration handles collected)
            if (action !== 'collected') {
              setIsCollectFeeModalOpen(false);
            }
          }}
        />
      )}
      
      {/* Edit Contact Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={closeEditModal}
        title="Edit Contact"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Contact Person */}
            <div>
              <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                id="contact_person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleFormChange}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleFormChange}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Mailbox Number */}
            <div>
              <label htmlFor="mailbox_number" className="block text-sm font-medium text-gray-700 mb-1">
                Mailbox # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="mailbox_number"
                name="mailbox_number"
                value={formData.mailbox_number}
                onChange={handleFormChange}
                placeholder="A123"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Unit Number */}
            <div>
              <label htmlFor="unit_number" className="block text-sm font-medium text-gray-700 mb-1">
                Unit #
              </label>
              <input
                type="text"
                id="unit_number"
                name="unit_number"
                value={formData.unit_number}
                onChange={handleFormChange}
                placeholder="101"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleFormChange}
                placeholder="917-822-5751"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Language Preference */}
            <div>
              <label htmlFor="language_preference" className="block text-sm font-medium text-gray-700 mb-1">
                Language Preference
              </label>
              <select
                id="language_preference"
                name="language_preference"
                value={formData.language_preference}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="English">English</option>
                <option value="Chinese">Chinese</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>

            {/* Service Tier */}
            <div>
              <label htmlFor="service_tier" className="block text-sm font-medium text-gray-700 mb-1">
                Service Tier
              </label>
              <select
                id="service_tier"
                name="service_tier"
                value={formData.service_tier}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>Tier 1</option>
                <option value={2}>Tier 2</option>
                <option value={3}>Tier 3</option>
              </select>
            </div>

            {/* Status */}
            <div className="col-span-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="No">Archived</option>
              </select>
            </div>

            {/* Display Name Preference */}
            <div className="col-span-2">
              <label htmlFor="display_name_preference" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name Preference
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  How should this customer appear in lists?
                </span>
              </label>
              <select
                id="display_name_preference"
                name="display_name_preference"
                value={formData.display_name_preference}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="both">Both (Company - Person)</option>
                <option value="company">Company Name Only</option>
                <option value="person">Person Name Only</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.display_name_preference === 'company' && formData.company_name && `Will show: "${formData.company_name}"`}
                {formData.display_name_preference === 'company' && !formData.company_name && 'Will show company name (enter company name above)'}
                {formData.display_name_preference === 'person' && formData.contact_person && `Will show: "${formData.contact_person}"`}
                {formData.display_name_preference === 'person' && !formData.contact_person && 'Will show person name (enter name above)'}
                {(formData.display_name_preference === 'both' || !formData.display_name_preference) && formData.company_name && formData.contact_person &&
                  `Will show: "${formData.company_name} - ${formData.contact_person}"`}
                {(formData.display_name_preference === 'both' || !formData.display_name_preference) && (!formData.company_name || !formData.contact_person) &&
                  'Shows both names, or whichever is available'}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Action Modal (Mark as Picked Up, Scanned, etc.) */}
      {actionMailItem && contact && (
        <ActionModal
          isOpen={isActionModalOpen}
          onClose={() => {
            setIsActionModalOpen(false);
            setActionMailItem(null);
            setActionGroupItems([]);
          }}
          mailItemId={actionMailItem.mail_item_id}
          mailItemIds={actionGroupItems.map(i => i.mail_item_id)}
          mailItemDetails={{
            customerName: contact.contact_person || contact.company_name || 'Customer',
            itemType: actionMailItem.item_type,
            currentStatus: actionMailItem.status,
            totalQuantity: actionGroupItems.reduce((sum, i) => sum + (i.quantity || 1), 0)
          }}
          actionType={actionType}
          onSuccess={() => {
            loadMailHistory();
            setIsActionModalOpen(false);
            setActionMailItem(null);
            setActionGroupItems([]);
          }}
        />
      )}

      {/* Edit Mail Item Modal */}
      <Modal
        isOpen={isEditMailModalOpen}
        onClose={() => {
          setIsEditMailModalOpen(false);
          setEditingMailItem(null);
          setEditingGroupItems([]);
        }}
        title="Edit Mail Item"
      >
        <form onSubmit={handleEditMailSubmit} className="space-y-4">
          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Type
            </label>
            <select
              value={editMailFormData.item_type}
              onChange={(e) => setEditMailFormData(prev => ({ ...prev, item_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Letter">Letter</option>
              <option value="Package">Package</option>
              <option value="Large Package">Large Package</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={editMailFormData.quantity}
              onChange={(e) => setEditMailFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={editMailFormData.description}
              onChange={(e) => setEditMailFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Amazon package, Tax documents"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsEditMailModalOpen(false);
                setEditingMailItem(null);
                setEditingGroupItems([]);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingMailEdit}
              className="px-6 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingMailEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Pickup Modal */}
      <Modal
        isOpen={isBulkPickupModalOpen}
        onClose={() => {
          setIsBulkPickupModalOpen(false);
          setBulkPickupPerformedBy('');
        }}
        title="Mark All as Picked Up"
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              <strong>Customer:</strong> {contact?.contact_person || contact?.company_name}
            </p>
            <p className="text-sm text-green-800 mt-1">
              <strong>Items to pick up:</strong>{' '}
              {pendingLetters > 0 && `${pendingLetters} letter${pendingLetters > 1 ? 's' : ''}`}
              {pendingLetters > 0 && pendingPackages > 0 && ', '}
              {pendingPackages > 0 && `${pendingPackages} package${pendingPackages > 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Who performed action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who performed this action? <span className="text-red-500">*</span>
            </label>
            <select
              value={bulkPickupPerformedBy}
              onChange={(e) => setBulkPickupPerformedBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select staff member...</option>
              <option value="Merlin">Merlin</option>
              <option value="Madison">Madison</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsBulkPickupModalOpen(false);
                setBulkPickupPerformedBy('');
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkPickup}
              disabled={processingBulkPickup || !bulkPickupPerformedBy}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {processingBulkPickup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm Pickup
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
