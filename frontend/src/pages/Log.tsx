import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, Search, ChevronRight, X, Calendar, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Edit, Trash2, Bell, CheckCircle, FileText, Send, AlertTriangle, Eye, MoreVertical, Loader2 } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';
import QuickNotifyModal from '../components/QuickNotifyModal.tsx';
import ActionModal from '../components/ActionModal.tsx';
import SendEmailModal from '../components/SendEmailModal.tsx';
import { getTodayNY, getNYTimestamp } from '../utils/timezone.ts';

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  pickup_date?: string;
  description?: string;
  last_notified?: string;
  contact_id: string;
  quantity?: number;
  contacts?: {
    contact_id: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
    unit_number?: string;
  };
}

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
}

interface ActionHistory {
  action_id: string;
  action_type: string;
  action_description: string;
  previous_value?: string;
  new_value?: string;
  performed_by: string;
  notes?: string;
  action_timestamp: string;
}

interface LogPageProps {
  embedded?: boolean;
  showAddForm?: boolean;
}

export default function LogPage({ embedded = false, showAddForm = false }: LogPageProps) {
  const navigate = useNavigate();
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [actionHistory, setActionHistory] = useState<Record<string, ActionHistory[]>>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('All Time');
  const [mailboxFilter, setMailboxFilter] = useState('All Mailboxes');
  const [sortColumn, setSortColumn] = useState<'date' | 'status' | 'customer' | 'type' | 'quantity'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isFilterExpanded, setIsFilterExpanded] = useState(true); // New state for filter panel
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMailItem, setEditingMailItem] = useState<MailItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  
  // Quick Notify Modal states
  const [isQuickNotifyModalOpen, setIsQuickNotifyModalOpen] = useState(false);
  const [notifyingMailItem, setNotifyingMailItem] = useState<MailItem | null>(null);
  
  // Send Email Modal states
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [emailingMailItem, setEmailingMailItem] = useState<MailItem | null>(null);
  
  // Action Modal states
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState<'picked_up' | 'forward' | 'scanned' | 'abandoned'>('picked_up');
  const [actionMailItem, setActionMailItem] = useState<MailItem | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    contact_id: '',
    item_type: 'Package',
    description: '',
    status: 'Received',
    received_date: '',
    quantity: 1,
    performed_by: '',
    edit_notes: ''
  });
  
  // Add form states (for showAddForm)
  // Get today's date in local timezone (not UTC)
  const [date, setDate] = useState(getTodayNY());
  const [itemType, setItemType] = useState('Letter');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingMail, setAddingMail] = useState(false);
  
  // Duplicate detection states
  const [existingTodayMail, setExistingTodayMail] = useState<MailItem | null>(null);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);

  useEffect(() => {
    loadMailItems();
    loadContacts();
  }, []);

  const loadMailItems = async () => {
    try {
      const data = await api.mailItems.getAll();
      setMailItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading mail items:', err);
      toast.error('Failed to load mail log');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await api.contacts.getAll();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  // Add form: Search contacts
  const searchContacts = useCallback(async () => {
    try {
      const filtered = contacts.filter((c: Contact) => {
        const isActive = (c as any).status !== 'No';
        const matchesQuery = 
          c.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.mailbox_number?.toLowerCase().includes(searchQuery.toLowerCase());
        return isActive && matchesQuery;
      });
      setSearchResults(filtered.slice(0, 8));
      setShowDropdown(true);
    } catch (err) {
      console.error('Error searching contacts:', err);
    }
  }, [contacts, searchQuery]);

  useEffect(() => {
    if (searchQuery) {
      void searchContacts();
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery, showAddForm, searchContacts]);

  const handleSelectContact = (contact: Contact) => {
    // Warn if selecting a Pending customer
    if ((contact as any).status === 'Pending') {
      if (!window.confirm('⚠️ Warning: This customer has "Pending" status and may not be fully onboarded yet. Are you sure you want to log mail for this customer?')) {
        return; // Don't select if user cancels
      }
    }
    
    setSelectedContact(contact);
    setSearchQuery(contact.contact_person || contact.company_name || '');
    setShowDropdown(false);
  };

  const handleAddMailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContact) {
      toast.error('Please select a customer');
      return;
    }

    // Check if customer already has mail logged today (NY timezone)
    const todayStr = date; // Using the selected date from form (YYYY-MM-DD format)
    
    console.log('=== Duplicate Detection Debug ===');
    console.log('Selected customer:', selectedContact.contact_person || selectedContact.company_name);
    console.log('Form date:', todayStr);
    console.log('Mail items to check:', mailItems.length);
    
    const existingMail = mailItems.find(item => {
      // Must be same customer
      if (item.contact_id !== selectedContact.contact_id) return false;
      if (!item.received_date) return false;
      
      // Extract date part (YYYY-MM-DD) from received_date
      // Handle both "2025-11-25" and "2025-11-25T00:00:00..." formats
      const itemDate = item.received_date.split('T')[0];
      
      console.log('Checking item:', {
        customer: item.contacts?.contact_person || item.contacts?.company_name,
        itemDate,
        todayStr,
        match: itemDate === todayStr,
        status: item.status
      });
      
      // Must be same date
      if (itemDate !== todayStr) return false;
      
      // CRITICAL: Only allow adding to mail that hasn't been notified yet
      // Once mail is notified, customer expects that quantity - new mail needs new notification
      const canAddTo = item.status === 'Received';
      
      console.log('Can add to existing?', canAddTo, '(status:', item.status, ')');
      
      return canAddTo;
    });

    console.log('Found existing mail:', existingMail ? 'YES' : 'NO');
    if (existingMail) {
      console.log('Existing mail details:', {
        id: existingMail.mail_item_id,
        type: existingMail.item_type,
        quantity: existingMail.quantity,
        status: existingMail.status
      });
    }

    if (existingMail) {
      // Always show prompt when duplicate is found
      console.log('Showing duplicate prompt modal');
      setExistingTodayMail(existingMail);
      setShowDuplicatePrompt(true);
      return;
    }

    console.log('No duplicate found, creating new mail');
    // No duplicate found, proceed with creating new mail
    await submitNewMail(false);
  };

  const submitNewMail = async (addToExisting: boolean) => {
    setAddingMail(true);

    try {
      if (addToExisting && existingTodayMail) {
        // Update existing mail item quantity
        const newQuantity = (existingTodayMail.quantity || 1) + quantity;
        
        console.log('Updating existing mail item:', {
          mail_item_id: existingTodayMail.mail_item_id,
          old_quantity: existingTodayMail.quantity || 1,
          new_quantity: newQuantity
        });
        
        await api.mailItems.update(existingTodayMail.mail_item_id, {
          quantity: newQuantity
        });

        console.log('Creating action history...');
        
        // Log action in history
        await api.actionHistory.create({
          mail_item_id: existingTodayMail.mail_item_id,
          action_type: 'updated',
          action_description: `Added ${quantity} more ${itemType}${quantity > 1 ? 's' : ''} (total now: ${newQuantity})`,
          performed_by: 'Staff',
          notes: note || null
        });

        console.log('Successfully added to existing mail!');
        toast.success(`Added ${quantity} more items to existing log (total: ${newQuantity})`);
      } else {
        console.log('Creating new mail item...');
        
        // Send the actual current timestamp to capture when mail was logged
        await api.mailItems.create({
          contact_id: selectedContact!.contact_id,
          item_type: itemType,
          description: note,
          status: 'Received',
          quantity: quantity,
          received_date: getNYTimestamp()
        });

        console.log('Successfully created new mail!');
        toast.success(`${quantity} mail item(s) added successfully!`);
      }
      
      // Reset form and states
      setItemType('Letter');
      setQuantity(1);
      setNote('');
      setSearchQuery('');
      setSelectedContact(null);
      setDate(getTodayNY()); // Use NY timezone
      setShowDuplicatePrompt(false);
      setExistingTodayMail(null);
      
      // Small delay before reloading to ensure database has committed the timestamp
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reload mail items
      loadMailItems();
    } catch (err) {
      console.error('Error in submitNewMail:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to add mail item: ${errorMessage}`);
    } finally {
      setAddingMail(false);
    }
  };

  const openEditModal = (mailItem: MailItem) => {
    setEditingMailItem(mailItem);
    
    // Migrate old status names to new short names
    let status = mailItem.status || 'Received';
    if (status === 'Scanned Document') status = 'Scanned';
    if (status === 'Abandoned Package') status = 'Abandoned';
    
    setFormData({
      contact_id: mailItem.contact_id || '',
      item_type: mailItem.item_type || 'Package',
      description: mailItem.description || '',
      status: status,
      received_date: mailItem.received_date?.split('T')[0] || getTodayNY(),
      quantity: (mailItem as any).quantity || 1,
      performed_by: '',
      edit_notes: ''
    });
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditingMailItem(null);
    setFormData({
      contact_id: '',
      item_type: 'Package',
      description: '',
      status: 'Received',
      received_date: '',
      quantity: 1,
      performed_by: '',
      edit_notes: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'quantity' ? parseInt(value) || 1 : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contact_id) {
      toast.error('Please select a customer');
      return;
    }

    setSaving(true);

    try {
      if (editingMailItem) {
        // Normalize both old and new status for comparison (to handle legacy names)
        const normalizeStatus = (status: string) => {
          if (status === 'Scanned Document') return 'Scanned';
          if (status === 'Abandoned Package') return 'Abandoned';
          return status;
        };
        
        const normalizedOldStatus = normalizeStatus(editingMailItem.status);
        const normalizedNewStatus = normalizeStatus(formData.status);
        
        // Only consider it a "real" status change if normalized values differ
        const statusActuallyChanged = normalizedOldStatus !== normalizedNewStatus;
        
        // Check if quantity changed
        const oldQuantity = editingMailItem.quantity || 1;
        const newQuantity = formData.quantity;
        const quantityChanged = oldQuantity !== newQuantity;
        
        // If status changed, require staff name
        if (statusActuallyChanged && !formData.performed_by.trim()) {
          toast.error('Please select who made this status change');
          setSaving(false);
          return;
        }
        
        // If quantity changed, require staff name
        if (quantityChanged && !formData.performed_by.trim()) {
          toast.error('Please select who made this quantity change');
          setSaving(false);
          return;
        }
        
        // Update the mail item (exclude performed_by and edit_notes from the update payload)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { performed_by: _performed_by, edit_notes: _edit_notes, ...updateData } = formData;
        
        // If received_date is being updated and it's a date-only string, add timezone
        if (updateData.received_date && /^\d{4}-\d{2}-\d{2}$/.test(updateData.received_date)) {
          updateData.received_date = `${updateData.received_date}T12:00:00-05:00`;
        }
        
        await api.mailItems.update(editingMailItem.mail_item_id, updateData);
        
        // Log quantity change to action history
        if (quantityChanged) {
          await api.actionHistory.create({
            mail_item_id: editingMailItem.mail_item_id,
            action_type: 'updated',
            action_description: `Quantity changed from ${oldQuantity} to ${newQuantity}`,
            previous_value: oldQuantity.toString(),
            new_value: newQuantity.toString(),
            performed_by: formData.performed_by,
            notes: formData.edit_notes.trim() || null
          });
        }
        
        // Log status change to action history if status ACTUALLY changed (not just name migration)
        if (statusActuallyChanged) {
          const statusDescriptions: { [key: string]: string } = {
            'Received': 'Status changed to Received',
            'Pending': 'Status changed to Pending',
            'Notified': 'Status changed to Notified',
            'Picked Up': 'Marked as Picked Up',
            'Scanned': 'Marked as Scanned',
            'Forward': 'Forwarded',
            'Abandoned': 'Marked as Abandoned'
          };
          
          await api.actionHistory.create({
            mail_item_id: editingMailItem.mail_item_id,
            action_type: 'status_change',
            action_description: statusDescriptions[normalizedNewStatus] || `Status changed to ${normalizedNewStatus}`,
            previous_value: normalizedOldStatus,
            new_value: normalizedNewStatus,
            performed_by: formData.performed_by,
            notes: formData.edit_notes.trim() || null
          });
        }
        
        toast.success('Mail item updated successfully!');
        closeModal();
        await loadMailItems(); // Ensure we wait for reload
      }
    } catch (err) {
      console.error('Failed to update mail item:', err);
      toast.error('Failed to update mail item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mailItemId: string) => {
    if (!confirm('Are you sure you want to delete this mail item? This action cannot be undone.')) {
      return;
    }

    setDeletingItemId(mailItemId);

    try {
      await api.mailItems.delete(mailItemId);
      toast.success('Mail item deleted successfully!');
      loadMailItems();
    } catch (err) {
      console.error('Failed to delete mail item:', err);
      toast.error('Failed to delete mail item');
    } finally {
      setDeletingItemId(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const quickStatusUpdate = async (mailItemId: string, newStatus: string, currentStatus?: string) => {
    // Store the previous status for undo
    const previousStatus = currentStatus || 'Received';
    
    try {
      // Update to new status
      await api.mailItems.update(mailItemId, { status: newStatus });
      
      // Show success toast with undo button
      toast.success(
        (t) => (
          <div className="flex items-center justify-between gap-4">
            <span>Status updated to {newStatus}</span>
            <button
              onClick={async () => {
                try {
                  await api.mailItems.update(mailItemId, { status: previousStatus });
                  toast.dismiss(t.id);
                  toast.success(`Undone! Status reverted to ${previousStatus}`);
                  loadMailItems();
                } catch (err) {
                  console.error('Failed to undo:', err);
                  toast.error('Failed to undo');
                }
              }}
              className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-900 text-sm font-medium rounded border border-gray-300 transition-colors"
            >
              Undo
            </button>
          </div>
        ),
        {
          duration: 8000, // Show for 8 seconds to give time to undo
        }
      );
      
      loadMailItems();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openQuickNotifyModal = (item: MailItem) => {
    setNotifyingMailItem(item);
    setIsQuickNotifyModalOpen(true);
  };

  const openSendEmailModal = (item: MailItem) => {
    setEmailingMailItem(item);
    setIsSendEmailModalOpen(true);
  };

  const handleQuickNotifySuccess = () => {
    loadMailItems();
    // Reload action history if the row is expanded
    if (notifyingMailItem && expandedRows.has(notifyingMailItem.mail_item_id)) {
      loadActionHistory(notifyingMailItem.mail_item_id);
    }
  };

  const handleSendEmailSuccess = () => {
    loadMailItems();
    // Reload action history if the row is expanded
    if (emailingMailItem && expandedRows.has(emailingMailItem.mail_item_id)) {
      loadActionHistory(emailingMailItem.mail_item_id);
    }
  };

  const handleActionSuccess = () => {
    loadMailItems();
    // Reload action history if the row is expanded
    if (actionMailItem && expandedRows.has(actionMailItem.mail_item_id)) {
      loadActionHistory(actionMailItem.mail_item_id);
    }
  };

  const loadActionHistory = async (mailItemId: string) => {
    try {
      const history = await api.actionHistory.getByMailItem(mailItemId);
      setActionHistory(prev => ({
        ...prev,
        [mailItemId]: history
      }));
    } catch (err) {
      console.error('Failed to load action history:', err);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      // Load action history when row is expanded
      if (!actionHistory[id]) {
        loadActionHistory(id);
      }
    }
    setExpandedRows(newExpanded);
  };

  const clearAllFilters = () => {
    setStatusFilter('All Status');
    setTypeFilter('All Types');
    setSearchTerm('');
    setDateRangeFilter('All Time');
    setMailboxFilter('All Mailboxes');
    setSortColumn('date');
    setSortDirection('desc');
  };

  const handleSort = (column: 'date' | 'status' | 'customer' | 'type' | 'quantity') => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending (except date defaults to descending)
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };

  const getDateRangeFilter = () => {
    const today = new Date();
    switch (dateRangeFilter) {
      case 'Today':
        return { start: new Date(today.setHours(0, 0, 0, 0)), end: new Date(today.setHours(23, 59, 59, 999)) };
      case 'Last 7 Days':
        return { start: new Date(today.setDate(today.getDate() - 7)), end: new Date() };
      case 'Last 30 Days':
        return { start: new Date(today.setDate(today.getDate() - 30)), end: new Date() };
      case 'All Time':
      default:
        return null;
    }
  };

  // Get unique mailboxes for filter
  const uniqueMailboxes = Array.from(new Set(
    mailItems
      .map(item => item.contacts?.mailbox_number)
      .filter(Boolean)
  )).sort();

  const filteredItems = mailItems.filter((item) => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      item.contacts?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contacts?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contacts?.mailbox_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contacts?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'All Status' || item.status === statusFilter;
    
    // Type filter
    const matchesType = typeFilter === 'All Types' || item.item_type === typeFilter;

    // Date range filter
    const dateRange = getDateRangeFilter();
    const matchesDateRange = !dateRange || (
      new Date(item.received_date) >= dateRange.start &&
      new Date(item.received_date) <= dateRange.end
    );

    // Mailbox filter
    const matchesMailbox = mailboxFilter === 'All Mailboxes' || 
      item.contacts?.mailbox_number === mailboxFilter;

    return matchesSearch && matchesStatus && matchesType && matchesDateRange && matchesMailbox;
  });

  // Sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'date':
        comparison = new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'customer': {
        const nameA = a.contacts?.contact_person || a.contacts?.company_name || '';
        const nameB = b.contacts?.contact_person || b.contacts?.company_name || '';
        comparison = nameA.localeCompare(nameB);
        break;
      }
      case 'type':
        comparison = a.item_type.localeCompare(b.item_type);
        break;
      case 'quantity': {
        const qtyA = a.quantity || 1;
        const qtyB = b.quantity || 1;
        comparison = qtyA - qtyB;
        break;
      }
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Count active filters
  const activeFiltersCount = [
    statusFilter !== 'All Status',
    typeFilter !== 'All Types',
    searchTerm !== '',
    dateRangeFilter !== 'All Time',
    mailboxFilter !== 'All Mailboxes'
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'max-w-7xl mx-auto px-6 py-8'}>
      {/* Header - only show if not embedded */}
      {!embedded && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mail Log</h1>
          <p className="text-gray-600">Complete history of mail activities</p>
        </div>
      )}

      {/* Add New Mail Form - show if enabled */}
      {showAddForm && (
        <form onSubmit={handleAddMailSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Mail</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={getTodayNY()}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">Cannot select future dates</p>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={itemType}
                onChange={(e) => {
                  const newType = e.target.value;
                  // Check if selecting Package for Tier 1 customer
                  if (newType === 'Package' && selectedContact && (selectedContact as any).service_tier === 1) {
                    if (!window.confirm('⚠️ Warning: This customer is on Service Tier 1, which typically does not include package handling. Are you sure you want to log a package for this customer?')) {
                      return; // Don't change if user cancels
                    }
                  }
                  setItemType(newType);
                }}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Letter">Letter</option>
                <option value="Package">Package</option>
              </select>
              {itemType === 'Package' && selectedContact && (selectedContact as any).service_tier === 1 && (
                <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Tier 1 customers typically don't receive packages
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add any relevant notes..."
              className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Link to Customer */}
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Link to Customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Name / Company / Mailbox #..."
                className="w-full px-4 py-2 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((contact) => (
                  <button
                    key={contact.contact_id}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">
                        {contact.contact_person || contact.company_name}
                      </div>
                      {(contact as any).status && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          (contact as any).status === 'Active' 
                            ? 'bg-green-100 text-green-700' 
                            : (contact as any).status === 'Pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {(contact as any).status}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 flex gap-4">
                      {contact.mailbox_number && <span>📮 {contact.mailbox_number}</span>}
                      {(contact as any).unit_number && <span>🏢 Unit {(contact as any).unit_number}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Contact Display */}
            {selectedContact && (
              <div className={`mt-3 px-4 py-3 rounded-lg flex items-center justify-between ${
                (selectedContact as any).status === 'Pending' 
                  ? 'bg-amber-50 border border-amber-300' 
                  : (selectedContact as any).status === 'Archived'
                  ? 'bg-gray-100 border border-gray-300'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`font-medium ${
                      (selectedContact as any).status === 'Pending' 
                        ? 'text-amber-900' 
                        : (selectedContact as any).status === 'Archived'
                        ? 'text-gray-700'
                        : 'text-green-900'
                    }`}>
                      {selectedContact.contact_person || selectedContact.company_name}
                    </div>
                    {(selectedContact as any).status === 'Pending' && (
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded">
                        Pending
                      </span>
                    )}
                    {(selectedContact as any).status === 'Archived' && (
                      <span className="px-2 py-0.5 bg-gray-300 text-gray-700 text-xs font-medium rounded">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className={`text-sm ${
                    (selectedContact as any).status === 'Pending' 
                      ? 'text-amber-700' 
                      : (selectedContact as any).status === 'Archived'
                      ? 'text-gray-600'
                      : 'text-green-700'
                  }`}>
                    {selectedContact.mailbox_number && `📮 ${selectedContact.mailbox_number}`}
                  </div>
                  {(selectedContact as any).status === 'Pending' && (
                    <div className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Customer not fully onboarded
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContact(null);
                    setSearchQuery('');
                  }}
                  className={`${
                    (selectedContact as any).status === 'Pending' 
                      ? 'text-amber-700 hover:text-amber-900' 
                      : (selectedContact as any).status === 'Archived'
                      ? 'text-gray-600 hover:text-gray-800'
                      : 'text-green-700 hover:text-green-900'
                  } transition-colors`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={addingMail || !selectedContact}
            className="w-full px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingMail ? 'Saving...' : 'Add Mail Item'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
        {/* Filter Header - Always Visible */}
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="w-full flex items-center gap-2 p-4 hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {activeFiltersCount} active
            </span>
          )}
          {activeFiltersCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAllFilters();
              }}
              className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear all
            </button>
          )}
          <div className={`ml-${activeFiltersCount > 0 ? '0' : 'auto'} text-gray-400`}>
            {isFilterExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {/* Filter Content - Collapsible */}
        {isFilterExpanded && (
          <div className="px-4 pb-4 border-t border-gray-200">
            {/* Filter Row 1 */}
            <div className="grid grid-cols-4 gap-4 mb-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option>All Status</option>
                  <option>Received</option>
                  <option>Pending</option>
                  <option>Notified</option>
                  <option>Picked Up</option>
                  <option>Scanned</option>
                  <option>Scanned Document</option>
                  <option>Forward</option>
                  <option>Abandoned</option>
                  <option>Abandoned Package</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option>All Types</option>
                  <option>Letter</option>
                  <option>Package</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date Range
                </label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option>All Time</option>
                  <option>Today</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mailbox</label>
                <select
                  value={mailboxFilter}
                  onChange={(e) => setMailboxFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option>All Mailboxes</option>
                  {uniqueMailboxes.map(mailbox => (
                    <option key={mailbox} value={mailbox}>{mailbox}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Row 2 - Just Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customer, mailbox, unit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {statusFilter !== 'All Status' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      Status: {statusFilter}
                      <button onClick={() => setStatusFilter('All Status')} className="hover:bg-blue-200 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {typeFilter !== 'All Types' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                      Type: {typeFilter}
                      <button onClick={() => setTypeFilter('All Types')} className="hover:bg-purple-200 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {dateRangeFilter !== 'All Time' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      Date: {dateRangeFilter}
                      <button onClick={() => setDateRangeFilter('All Time')} className="hover:bg-green-200 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {mailboxFilter !== 'All Mailboxes' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                      Mailbox: {mailboxFilter}
                      <button onClick={() => setMailboxFilter('All Mailboxes')} className="hover:bg-orange-200 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {searchTerm !== '' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className="hover:bg-gray-200 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Counter */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{sortedItems.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{mailItems.length}</span> mail items
        </p>
        <p className="text-sm text-gray-500 italic">
          💡 Click column headers to sort
        </p>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="overflow-x-auto">
        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {activeFiltersCount > 0 ? 'No mail items match your filters' : 'No mail items found'}
            </p>
            {activeFiltersCount > 0 ? (
              <button
                onClick={clearAllFilters}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => navigate('/dashboard/intake')}
                className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                Add Mail Item
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700 w-10"></th>
                
                {/* Date Column - Sortable */}
                <th 
                  className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortColumn === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Type Column - Sortable */}
                <th 
                  className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-2">
                    Type
                    {sortColumn === 'type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Quantity Column - Sortable */}
                <th 
                  className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center gap-2">
                    Qty
                    {sortColumn === 'quantity' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Customer Column - Sortable */}
                <th 
                  className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('customer')}
                >
                  <div className="flex items-center gap-2">
                    Customer
                    {sortColumn === 'customer' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Status Column - Sortable */}
                <th 
                  className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortColumn === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Non-sortable columns */}
                  <th className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700">Last Notified</th>
                  <th className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700">Notes</th>
                  <th className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                  <React.Fragment key={item.mail_item_id}>
                    {/* Main Row - Clickable to expand */}
                    <tr 
                      className="group border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleRow(item.mail_item_id)}
                    >
                    <td className="py-3 px-4">
                      <button
                        className="text-gray-500 hover:text-gray-700 transition-transform pointer-events-none"
                        style={{
                          transform: expandedRows.has(item.mail_item_id) ? 'rotate(90deg)' : 'rotate(0deg)',
                          display: 'inline-block',
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      <span 
                        title={`Logged at: ${new Date(item.received_date).toLocaleString('en-US', {
                          timeZone: 'America/New_York',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                          timeZoneName: 'short'
                        })}`}
                        className="cursor-help border-b border-dotted border-gray-400"
                      >
                        {new Date(item.received_date).toISOString().split('T')[0]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        {item.item_type === 'Package' ? (
                          <Package className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Mail className="w-4 h-4 text-gray-500" />
                        )}
                        <span>{item.item_type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900 font-semibold">
                      {item.quantity || 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">
                          {item.contacts?.contact_person || item.contacts?.company_name || 'Unknown'}
                        </span>
                        {item.contact_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row expansion when clicking view button
                              navigate(`/dashboard/contacts/${item.contact_id}`);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View Customer Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        item.status === 'Received' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                        item.status === 'Notified' ? 'bg-purple-100 text-purple-700' :
                        item.status === 'Picked Up' ? 'bg-green-100 text-green-700' :
                        item.status === 'Scanned Document' ? 'bg-cyan-100 text-cyan-700' :
                        item.status === 'Scanned' ? 'bg-cyan-100 text-cyan-700' :
                        item.status === 'Forward' ? 'bg-orange-100 text-orange-700' :
                        item.status === 'Abandoned Package' ? 'bg-red-100 text-red-700' :
                        item.status === 'Abandoned' ? 'bg-red-100 text-red-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {item.status === 'Scanned Document' ? 'Scanned' : 
                         item.status === 'Abandoned Package' ? 'Abandoned' : 
                         item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {item.last_notified ? (
                        new Date(item.last_notified).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {item.description || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
                        {/* Edit and Delete buttons first */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.mail_item_id)}
                            disabled={deletingItemId === item.mail_item_id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group relative"
                            title="Delete"
                          >
                            {deletingItemId === item.mail_item_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        
                        {/* Separator */}
                        <div className="border-l border-gray-300 h-6 mx-1"></div>
                        
                        {/* More Actions Dropdown - on the far right */}
                        <div className="relative">
                          <button
                            id={`more-btn-${item.mail_item_id}`}
                            onClick={(_e) => {
                              setOpenDropdownId(openDropdownId === item.mail_item_id ? null : item.mail_item_id);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openDropdownId === item.mail_item_id && (
                            <>
                              {/* Backdrop to close dropdown */}
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={() => setOpenDropdownId(null)}
                              ></div>
                              
                              {/* Dropdown content - using fixed positioning */}
                              <div 
                                className="fixed w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-40 max-h-96 overflow-y-auto"
                                style={{
                                  top: `${(document.getElementById(`more-btn-${item.mail_item_id}`)?.getBoundingClientRect().bottom ?? 0) + 4}px`,
                                  right: `${window.innerWidth - (document.getElementById(`more-btn-${item.mail_item_id}`)?.getBoundingClientRect().right ?? 0)}px`,
                                }}
                              >
                                {/* Send Email - Always visible */}
                                <button
                                  onClick={() => {
                                    openSendEmailModal(item);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-3"
                                >
                                  <Send className="w-4 h-4 text-blue-600" />
                                  Send Email
                                </button>
                                
                                {/* Mark as Scanned - Always visible */}
                                <button
                                  onClick={() => {
                                    setActionMailItem(item);
                                    setActionModalType('scanned');
                                    setIsActionModalOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-cyan-50 flex items-center gap-3"
                                >
                                  <FileText className="w-4 h-4 text-cyan-600" />
                                  Mark as Scanned
                                </button>
                                
                                {/* Mark as Picked Up - Always visible */}
                                <button
                                  onClick={() => {
                                    setActionMailItem(item);
                                    setActionModalType('picked_up');
                                    setIsActionModalOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 flex items-center gap-3"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  Mark as Picked Up
                                </button>
                                
                                {/* Mark as Forward - Always visible */}
                                <button
                                  onClick={() => {
                                    setActionMailItem(item);
                                    setActionModalType('forward');
                                    setIsActionModalOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-3"
                                >
                                  <Send className="w-4 h-4 text-orange-600" />
                                  Mark as Forward
                                </button>
                                
                                {/* Mark as Abandoned - Always visible */}
                                <button
                                  onClick={() => {
                                    setActionMailItem(item);
                                    setActionModalType('abandoned');
                                    setIsActionModalOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 flex items-center gap-3"
                                >
                                  <AlertTriangle className="w-4 h-4 text-red-600" />
                                  Mark as Abandoned
                                </button>
                                
                                {/* Separator */}
                                <div className="border-t border-gray-200 my-1"></div>
                                
                                {/* View Customer Profile - Always available */}
                                {item.contact_id && (
                                  <button
                                    onClick={() => {
                                      navigate(`/dashboard/contacts/${item.contact_id}`);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                  >
                                    <Eye className="w-4 h-4 text-gray-600" />
                                    View Customer Profile
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Details */}
                  {expandedRows.has(item.mail_item_id) && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan={9} className="py-6 px-4">
                        <div className="space-y-6">
                          {/* Action History Timeline - Always show, display message if empty */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <Bell className="w-5 h-5 text-purple-600" />
                              Action History
                            </h3>
                            {actionHistory[item.mail_item_id]?.length > 0 ? (
                              <div className="space-y-3">
                                {actionHistory[item.mail_item_id].map((action) => {
                                  // Determine icon and color based on action type
                                  const getActionIcon = () => {
                                    if (action.action_description.includes('notified') || action.action_description.includes('Notified')) {
                                      return <Bell className="w-4 h-4 text-purple-600" />;
                                    } else if (action.action_description.includes('Picked Up')) {
                                      return <CheckCircle className="w-4 h-4 text-green-600" />;
                                    } else if (action.action_description.includes('Scanned')) {
                                      return <FileText className="w-4 h-4 text-cyan-600" />;
                                    } else if (action.action_description.includes('Forward')) {
                                      return <Send className="w-4 h-4 text-orange-600" />;
                                    } else if (action.action_description.includes('Abandoned')) {
                                      return <AlertTriangle className="w-4 h-4 text-red-600" />;
                                    }
                                    return <Mail className="w-4 h-4 text-gray-600" />;
                                  };

                                  const getBadgeColor = () => {
                                    if (action.action_description.includes('notified') || action.action_description.includes('Notified')) {
                                      return 'bg-purple-100 text-purple-700';
                                    } else if (action.action_description.includes('Picked Up')) {
                                      return 'bg-green-100 text-green-700';
                                    } else if (action.action_description.includes('Scanned')) {
                                      return 'bg-cyan-100 text-cyan-700';
                                    } else if (action.action_description.includes('Forward')) {
                                      return 'bg-orange-100 text-orange-700';
                                    } else if (action.action_description.includes('Abandoned')) {
                                      return 'bg-red-100 text-red-700';
                                    }
                                    return 'bg-gray-100 text-gray-700';
                                  };

                                  return (
                                    <div key={action.action_id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                                      <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                          {getActionIcon()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-semibold text-gray-900">
                                              {new Date(action.action_timestamp).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                              })}
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getBadgeColor()}`}>
                                              {action.action_description}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-600 mb-1">
                                            Performed by: <span className="font-medium text-gray-900">{action.performed_by}</span>
                                          </p>
                                          {action.previous_value && action.new_value && (
                                            <p className="text-xs text-gray-500">
                                              Status changed: <span className="font-medium">{action.previous_value}</span> → <span className="font-medium">{action.new_value}</span>
                                            </p>
                                          )}
                                          {action.notes && (
                                            <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded border border-gray-200 italic">
                                              Note: {action.notes}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="bg-white p-4 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
                                No actions recorded yet. Actions will appear here when staff perform operations on this mail item.
                              </div>
                            )}
                          </div>

                          {/* Mail Item Details */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3">Mail Item Details</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {item.pickup_date && (
                                <div>
                                  <span className="text-gray-600">Picked Up:</span>
                                  <span className="ml-2 text-gray-900 font-medium">
                                    {new Date(item.pickup_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Mailbox:</span>
                                <span className="ml-2 text-gray-900 font-medium">
                                  {item.contacts?.mailbox_number || 'N/A'}
                                </span>
                              </div>
                              {item.contacts?.unit_number && (
                                <div>
                                  <span className="text-gray-600">Unit:</span>
                                  <span className="ml-2 text-gray-900 font-medium">
                                    {item.contacts.unit_number}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
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

      {filteredItems.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredItems.length} of {mailItems.length} items
        </div>
      )}

      {/* Edit Mail Item Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={closeModal}
        title="Edit Mail Item"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Customer *</label>
            <select
              name="contact_id"
              value={formData.contact_id}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a customer</option>
              {contacts
                .filter(contact => (contact as any).status !== 'No')
                .map(contact => (
                  <option key={contact.contact_id} value={contact.contact_id}>
                    {contact.contact_person || contact.company_name} - {contact.mailbox_number}
                  </option>
                ))
              }
            </select>
          </div>

          {/* Date and Quantity - Two Column Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Received Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Date *</label>
              {editingMailItem && (
                <p className="text-xs text-gray-500 mb-2">
                  Current: {new Date(editingMailItem.received_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              )}
              <input
                type="date"
                name="received_date"
                value={formData.received_date}
                onChange={handleChange}
                max={getTodayNY()}
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">Cannot select future dates</p>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Quantity *</label>
              {editingMailItem && (
                <p className="text-xs text-gray-500 mb-2">
                  Current: {(editingMailItem as any).quantity || 1} item(s)
                </p>
              )}
              <input
                type="number"
                name="quantity"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Mail Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Mail Type *</label>
            <select
              name="item_type"
              value={formData.item_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Letter">Letter</option>
              <option value="Package">Package</option>
              <option value="Certified Mail">Certified Mail</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
              <option value="Notified">Notified</option>
              <option value="Picked Up">Picked Up</option>
              <option value="Scanned">Scanned</option>
              <option value="Forward">Forward</option>
              <option value="Abandoned">Abandoned</option>
            </select>
          </div>

          {/* Show staff and notes fields if status or quantity changed */}
          {editingMailItem && (formData.status !== editingMailItem.status || formData.quantity !== (editingMailItem.quantity || 1)) && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                {formData.status !== editingMailItem.status && (
                  <p className="text-sm text-blue-800 font-medium mb-3">
                    Status is being changed from "{editingMailItem.status}" to "{formData.status}"
                  </p>
                )}
                {formData.quantity !== (editingMailItem.quantity || 1) && (
                  <p className="text-sm text-blue-800 font-medium mb-3">
                    Quantity is being changed from {editingMailItem.quantity || 1} to {formData.quantity}
                  </p>
                )}
                
                {/* Who performed this action */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Who is making this change? *
                  </label>
                  <select
                    name="performed_by"
                    value={formData.performed_by}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select staff member...</option>
                    <option value="Merlin">Merlin</option>
                    <option value="Madison">Madison</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="edit_notes"
                    value={formData.edit_notes}
                    onChange={handleChange}
                    placeholder="Add any notes about this change..."
                    rows={2}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add any notes about this mail item..."
              rows={3}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Updating...' : 'Update Mail Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Notify Modal */}
      {notifyingMailItem && (
        <QuickNotifyModal
          isOpen={isQuickNotifyModalOpen}
          onClose={() => {
            setIsQuickNotifyModalOpen(false);
            setNotifyingMailItem(null);
          }}
          mailItemId={notifyingMailItem.mail_item_id}
          contactId={notifyingMailItem.contact_id}
          customerName={notifyingMailItem.contacts?.contact_person || notifyingMailItem.contacts?.company_name || 'Customer'}
          onSuccess={handleQuickNotifySuccess}
        />
      )}

      {/* Send Email Modal */}
      {emailingMailItem && (
        <SendEmailModal
          isOpen={isSendEmailModalOpen}
          onClose={() => {
            setIsSendEmailModalOpen(false);
            setEmailingMailItem(null);
          }}
          mailItem={emailingMailItem}
          onSuccess={handleSendEmailSuccess}
        />
      )}

      {/* Action Modal */}
      {actionMailItem && (
        <ActionModal
          isOpen={isActionModalOpen}
          onClose={() => {
            setIsActionModalOpen(false);
            setActionMailItem(null);
          }}
          mailItemId={actionMailItem.mail_item_id}
          mailItemDetails={{
            customerName: actionMailItem.contacts?.contact_person || actionMailItem.contacts?.company_name || 'Customer',
            itemType: actionMailItem.item_type,
            currentStatus: actionMailItem.status
          }}
          actionType={actionModalType}
          onSuccess={handleActionSuccess}
        />
      )}

      {/* Duplicate Mail Prompt Modal */}
      {showDuplicatePrompt && existingTodayMail && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Mail Already Logged Today</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">
                    {selectedContact.contact_person || selectedContact.company_name}
                  </span>
                  {' '}already has mail logged today:
                </p>
                <div className="text-sm text-gray-600 pl-4 border-l-2 border-yellow-400">
                  <p><strong>{existingTodayMail.quantity || 1}x {existingTodayMail.item_type}</strong></p>
                  <p>Status: {existingTodayMail.status}</p>
                  <p>Logged: {new Date(existingTodayMail.received_date).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Would you like to <strong>add {quantity} more {itemType}{quantity > 1 ? 's' : ''}</strong> to the existing log, 
                or create a separate entry?
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await submitNewMail(true);
                }}
                disabled={addingMail}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingMail ? 'Adding...' : `Add to Existing (Total: ${(existingTodayMail.quantity || 1) + quantity})`}
              </button>
              
              <button
                onClick={async () => {
                  await submitNewMail(false);
                }}
                disabled={addingMail}
                className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingMail ? 'Creating...' : 'Create Separate Entry'}
              </button>

              <button
                onClick={() => {
                  setShowDuplicatePrompt(false);
                  setExistingTodayMail(null);
                }}
                disabled={addingMail}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
