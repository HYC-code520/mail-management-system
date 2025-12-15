import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Package, Search, ChevronRight, X, Calendar, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Edit, Trash2, CheckCircle, FileText, Send, AlertTriangle, Eye, MoreVertical, Loader2 } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';
import QuickNotifyModal from '../components/QuickNotifyModal.tsx';
import ActionModal from '../components/ActionModal.tsx';
import SendEmailModal from '../components/SendEmailModal.tsx';
import ActionHistorySection from '../components/ActionHistorySection.tsx';
import { getTodayNY } from '../utils/timezone.ts';

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

// Grouped mail items for same person, same day, same type
interface GroupedMailItem {
  groupKey: string;           // contact_id|date|item_type
  contact: MailItem['contacts'];
  contactId: string;
  date: string;               // YYYY-MM-DD
  itemType: string;
  items: MailItem[];          // All individual items in this group
  totalQuantity: number;
  statuses: string[];         // Unique statuses
  displayStatus: string;      // "Mixed" if different, otherwise the status
  latestReceivedDate: string; // For sorting
  hasDescription: boolean;
}

// Group mail items by contact + day + type
function groupMailItems(items: MailItem[]): GroupedMailItem[] {
  const groups = new Map<string, GroupedMailItem>();

  for (const item of items) {
    // Extract date (YYYY-MM-DD) from received_date
    const date = item.received_date.split('T')[0];
    const groupKey = `${item.contact_id}|${date}|${item.item_type}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        contact: item.contacts,
        contactId: item.contact_id,
        date,
        itemType: item.item_type,
        items: [],
        totalQuantity: 0,
        statuses: [],
        displayStatus: '',
        latestReceivedDate: item.received_date,
        hasDescription: false,
      });
    }

    const group = groups.get(groupKey)!;
    group.items.push(item);
    group.totalQuantity += item.quantity || 1;
    
    if (!group.statuses.includes(item.status)) {
      group.statuses.push(item.status);
    }
    
    if (item.description) {
      group.hasDescription = true;
    }

    // Track latest received date for sorting
    if (item.received_date > group.latestReceivedDate) {
      group.latestReceivedDate = item.received_date;
    }
  }

  // Calculate display status for each group
  for (const group of groups.values()) {
    if (group.statuses.length === 1) {
      group.displayStatus = group.statuses[0];
    } else {
      // Prioritize certain statuses for display
      const priorityOrder = ['Picked Up', 'Notified', 'Received', 'Forwarded', 'Scanned & Sent', 'Abandoned'];
      const sortedStatuses = group.statuses.sort((a, b) => 
        priorityOrder.indexOf(a) - priorityOrder.indexOf(b)
      );
      group.displayStatus = `Mixed (${sortedStatuses.join(', ')})`;
    }

    // Sort items within group by received_date (newest first)
    group.items.sort((a, b) => 
      new Date(b.received_date).getTime() - new Date(a.received_date).getTime()
    );
  }

  return Array.from(groups.values());
}

interface LogPageProps {
  embedded?: boolean;
  showAddForm?: boolean;
}

export default function LogPage({ embedded = false, showAddForm = false }: LogPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [actionHistory, setActionHistory] = useState<Record<string, ActionHistory[]>>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [highlightedGroupKeys, setHighlightedGroupKeys] = useState<Set<string>>(new Set()); // Changed to Set for multiple highlights
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('All Time');
  const [mailboxFilter, setMailboxFilter] = useState('All Mailboxes');
  const [sortColumn, setSortColumn] = useState<'date' | 'status' | 'customer' | 'type' | 'quantity' | 'lastNotified'>('date');
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
  const [formData, setFormData] = useState<{
    contact_id: string;
    item_type: string;
    description: string;
    status: string;
    received_date: string;
    quantity: number | '';
    performed_by: string;
    edit_notes: string;
  }>({
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
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingMail, setAddingMail] = useState(false);
  const [loggedBy, setLoggedBy] = useState<string | null>(null); // NEW: Staff selection for logging mail
  
  // Duplicate detection state
  const [existingTodayMail, setExistingTodayMail] = useState<MailItem | null>(null);

  useEffect(() => {
    loadMailItems();
    loadContacts();
  }, []);

  // State to track pending jump after data refresh (used in useEffect after groupedItems is defined)
  const [pendingJumpGroupKey, setPendingJumpGroupKey] = useState<string | null>(null);
  const [pendingJumpGroupKeys, setPendingJumpGroupKeys] = useState<string[]>([]); // For bulk emails

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
      // Automatically add to existing item since we're using grouped view
      console.log('Found existing mail, automatically adding to it');
      setExistingTodayMail(existingMail);
      
      // Calculate new quantity
      const currentQuantity = typeof quantity === 'string' && quantity === '' ? 1 : Number(quantity);
      const newQuantity = (existingMail.quantity || 1) + currentQuantity;
      
      // Show confirmation toast before adding
      toast.success(
        `Adding ${currentQuantity} more ${itemType}${currentQuantity > 1 ? 's' : ''} to existing entry (total will be: ${newQuantity})`,
        { duration: 3000 }
      );
      
      // Add to existing
      await submitNewMail(true);
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
        // Update existing mail item quantity (ensure quantity is a number)
        const currentQuantity = typeof quantity === 'string' && quantity === '' ? 1 : Number(quantity);
        const newQuantity = (existingTodayMail.quantity || 1) + currentQuantity;
        
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
          action_description: `Added ${currentQuantity} more ${itemType}${currentQuantity > 1 ? 's' : ''} (total now: ${newQuantity})`,
          performed_by: loggedBy || 'Staff', // Use selected staff name
          notes: note || null
        });

        console.log('Successfully added to existing mail!');
        toast.success(`Added ${quantity} more items to existing log (total: ${newQuantity})`);
      } else {
        console.log('Creating new mail item...');
        
        // Convert the selected date to NY timezone timestamp
        const dateObj = new Date(date + 'T12:00:00');
        const nyYear = dateObj.getFullYear();
        const nyMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const nyDay = String(dateObj.getDate()).padStart(2, '0');
        const receivedDateNY = `${nyYear}-${nyMonth}-${nyDay}T12:00:00-05:00`;
        
        // Send the actual current timestamp to capture when mail was logged
        await api.mailItems.create({
          contact_id: selectedContact!.contact_id,
          item_type: itemType,
          description: note,
          status: 'Received',
          quantity: typeof quantity === 'string' && quantity === '' ? 1 : Number(quantity),
          received_date: receivedDateNY,
          logged_by: loggedBy || undefined // Pass staff name to backend
        });

        console.log('Successfully created new mail!');
        const finalQuantity = typeof quantity === 'string' && quantity === '' ? 1 : Number(quantity);
        toast.success(`${finalQuantity} mail item(s) added successfully!`);
      }
      
      // Reset form and states
      setItemType('Letter');
      setQuantity(1);
      setNote('');
      setSearchQuery('');
      setSelectedContact(null);
      setDate(getTodayNY()); // Use NY timezone
      setExistingTodayMail(null);
      setLoggedBy(null); // Reset staff selection
      
      // Small delay before reloading to ensure database has committed the timestamp
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reload mail items
      await loadMailItems();
      
      // After reload, highlight the newly added/updated item
      // Calculate the group key for the item we just added/updated
      const groupKey = addToExisting && existingTodayMail
        ? `${existingTodayMail.contact_id}|${date}|${existingTodayMail.item_type}`
        : `${selectedContact!.contact_id}|${date}|${itemType}`;
      
      // Wait a bit for the UI to settle after reload
      setTimeout(() => {
        // Find the row element by group key
        const rowElement = document.querySelector(`[data-group-key="${groupKey}"]`);
        if (rowElement) {
          // Scroll into view
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight the row
          setHighlightedGroupKeys(new Set([groupKey]));
          
          // Clear highlight after 8 seconds
          setTimeout(() => {
            setHighlightedGroupKeys(new Set());
          }, 8000);
        }
      }, 300);
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
      [name]: name === 'quantity' ? (value === '' ? '' : parseInt(value) || 1) : value 
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
        const { performed_by, edit_notes: _edit_notes, ...updateData } = formData;
        
        // Ensure quantity is a number (convert empty string to 1)
        updateData.quantity = typeof updateData.quantity === 'string' && updateData.quantity === '' ? 1 : Number(updateData.quantity);
        
        // If received_date is being updated and it's a date-only string, add timezone
        if (updateData.received_date && /^\d{4}-\d{2}-\d{2}$/.test(updateData.received_date)) {
          updateData.received_date = `${updateData.received_date}T12:00:00-05:00`;
        }
        
        // Pass performed_by to backend for action history logging
        await api.mailItems.update(editingMailItem.mail_item_id, {
          ...updateData,
          performed_by: performed_by || 'Staff' // Include performed_by in the update
        });
        
        // Backend automatically logs action history, so no need to manually create it here
        
        toast.success('Mail item updated successfully!');
        
        // Get the group key for the updated item
        const updatedDate = updateData.received_date 
          ? new Date(updateData.received_date).toISOString().split('T')[0]
          : editingMailItem.received_date.split('T')[0];
        const updatedGroupKey = `${editingMailItem.contact_id}|${updatedDate}|${updateData.item_type || editingMailItem.item_type}`;
        
        closeModal();
        
        // Clear action history cache for ALL items in the edited group
        // This ensures we reload fresh history after the edit
        const itemsInGroup = mailItems.filter(item => {
          const itemDate = item.received_date.split('T')[0];
          const itemGroupKey = `${item.contact_id}|${itemDate}|${item.item_type}`;
          return itemGroupKey === updatedGroupKey;
        });
        
        setActionHistory(prev => {
          const newHistory = { ...prev };
          // Clear history for all items in this group
          itemsInGroup.forEach(item => {
            delete newHistory[item.mail_item_id];
          });
          return newHistory;
        });
        
        await loadMailItems(); // Ensure we wait for reload
        
        // Force reload action history for the group after items are loaded
        setTimeout(async () => {
          for (const item of itemsInGroup) {
            await loadActionHistory(item.mail_item_id);
          }
        }, 300); // Small delay to ensure backend has committed the new action history
        
        // Show toast with "View" button to jump to the updated row
        const customerName = editingMailItem.contacts?.contact_person || 
                            editingMailItem.contacts?.company_name || 
                            'Customer';
        const itemTypeDisplay = updateData.item_type || editingMailItem.item_type;
        const dateDisplay = new Date(updatedDate).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        
        toast.success(
          (t) => (
            <div className="flex items-center justify-between gap-4">
              <span>Updated {customerName} ({itemTypeDisplay}, {dateDisplay})</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  jumpToRow(updatedGroupKey);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
              >
                View
              </button>
            </div>
          ),
          {
            duration: 8000,
          }
        );
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

  const openSendEmailModal = (item: MailItem) => {
    setEmailingMailItem(item);
    setIsSendEmailModalOpen(true);
  };

  const handleQuickNotifySuccess = () => {
    // Clear action history cache for the item so it reloads fresh
    if (notifyingMailItem) {
      setActionHistory(prev => {
        const newHistory = { ...prev };
        delete newHistory[notifyingMailItem.mail_item_id];
        return newHistory;
      });
      // Reload immediately for expanded groups
      loadActionHistory(notifyingMailItem.mail_item_id);
    }
    loadMailItems();
  };

  const handleSendEmailSuccess = () => {
    // Clear action history cache for the item so it reloads fresh
    if (emailingMailItem) {
      setActionHistory(prev => {
        const newHistory = { ...prev };
        delete newHistory[emailingMailItem.mail_item_id];
        return newHistory;
      });
      // Reload immediately for expanded groups
      loadActionHistory(emailingMailItem.mail_item_id);
    }
    loadMailItems();
  };

  const handleActionSuccess = () => {
    // Clear action history cache for the item so it reloads fresh
    if (actionMailItem) {
      setActionHistory(prev => {
        const newHistory = { ...prev };
        delete newHistory[actionMailItem.mail_item_id];
        return newHistory;
      });
      // Reload immediately for expanded groups
      loadActionHistory(actionMailItem.mail_item_id);
    }
    loadMailItems();
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

  // Load action history for all items in a group
  const loadGroupActionHistory = async (group: GroupedMailItem) => {
    for (const item of group.items) {
      if (!actionHistory[item.mail_item_id]) {
        await loadActionHistory(item.mail_item_id);
      }
    }
  };

  // Get combined action history for a group, sorted by timestamp
  const getGroupActionHistory = (group: GroupedMailItem): ActionHistory[] => {
    const allHistory: ActionHistory[] = [];
    for (const item of group.items) {
      const itemHistory = actionHistory[item.mail_item_id] || [];
      allHistory.push(...itemHistory);
    }
    // Sort by timestamp descending (newest first)
    return allHistory.sort((a, b) => 
      new Date(b.action_timestamp).getTime() - new Date(a.action_timestamp).getTime()
    );
  };

  // Toggle for grouped rows
  const toggleGroupRow = (group: GroupedMailItem) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(group.groupKey)) {
      newExpanded.delete(group.groupKey);
    } else {
      newExpanded.add(group.groupKey);
      // Load action history for all items in the group
      loadGroupActionHistory(group);
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

  const handleSort = (column: 'date' | 'status' | 'customer' | 'type' | 'quantity' | 'lastNotified') => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending (except date and lastNotified default to descending)
      setSortColumn(column);
      setSortDirection(column === 'date' || column === 'lastNotified' ? 'desc' : 'asc');
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

  // Group filtered items by contact + day + type
  const groupedItems = groupMailItems(filteredItems);

  // Handle navigation from Dashboard with jumpToGroupKey or jumpToGroupKeys
  useEffect(() => {
    const state = location.state as { 
      jumpToGroupKey?: string; 
      jumpToGroupKeys?: string[];
      sortByLastNotified?: boolean; // New flag for auto-sorting
    } | null;
    
    if (state?.jumpToGroupKey || state?.jumpToGroupKeys) {
      // Clear the state immediately to prevent re-triggering
      const sortByLastNotified = state.sortByLastNotified || false;
      navigate(location.pathname, { replace: true, state: {} });
      
      // Clear action history cache to force fresh load
      setActionHistory({});
      
      // Auto-sort by Last Notified if requested (for email actions)
      if (sortByLastNotified) {
        setSortColumn('lastNotified');
        setSortDirection('desc');
      }
      
      // Store the target group key(s) - we'll jump after data is loaded
      if (state.jumpToGroupKeys && state.jumpToGroupKeys.length > 0) {
        // Bulk email case - multiple group keys
        setPendingJumpGroupKeys(state.jumpToGroupKeys);
        setPendingJumpGroupKey(null);
      } else if (state.jumpToGroupKey) {
        // Single email case
        setPendingJumpGroupKey(state.jumpToGroupKey);
        setPendingJumpGroupKeys([]);
      }
      
      // Force reload mail items from backend
      setLoading(true);
      api.mailItems.getAll()
        .then(data => {
          setMailItems(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.error('Error reloading mail items:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [location.state, location.pathname, navigate]);

  // Jump to row after data is loaded and grouped (single row)
  useEffect(() => {
    if (pendingJumpGroupKey && groupedItems.length > 0 && !loading) {
      const targetGroupKey = pendingJumpGroupKey;
      // Check if the target group exists
      const group = groupedItems.find(g => g.groupKey === targetGroupKey);
      if (group) {
        // Small delay for DOM to fully render
        setTimeout(() => {
          // 1. Scroll to the row
          const rowElement = document.getElementById(`row-${targetGroupKey}`);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          // 2. Highlight the row (no auto-expand for better UX)
          setHighlightedGroupKeys(new Set([targetGroupKey]));
          setTimeout(() => setHighlightedGroupKeys(new Set()), 6000); // Highlight for 6 seconds
          
          setPendingJumpGroupKey(null);
        }, 150);
      } else {
        // Group not found
        setPendingJumpGroupKey(null);
      }
    }
  }, [pendingJumpGroupKey, groupedItems, loading]);

  // Jump to multiple rows after data is loaded (bulk email case)
  useEffect(() => {
    if (pendingJumpGroupKeys.length > 0 && groupedItems.length > 0 && !loading) {
      const targetGroupKeys = pendingJumpGroupKeys;
      
      // Find all matching groups
      const matchingGroups = groupedItems.filter(g => targetGroupKeys.includes(g.groupKey));
      
      if (matchingGroups.length > 0) {
        setTimeout(() => {
          // 1. Scroll to the first row
          const firstGroupKey = matchingGroups[0].groupKey;
          const firstRowElement = document.getElementById(`row-${firstGroupKey}`);
          if (firstRowElement) {
            firstRowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          // 2. Highlight ALL matching rows SIMULTANEOUSLY
          const groupKeysSet = new Set(matchingGroups.map(g => g.groupKey));
          setHighlightedGroupKeys(groupKeysSet);
          setTimeout(() => setHighlightedGroupKeys(new Set()), 6000); // Highlight for 6 seconds
          
          setPendingJumpGroupKeys([]);
        }, 150);
      } else {
        // No groups found
        setPendingJumpGroupKeys([]);
      }
    }
  }, [pendingJumpGroupKeys, groupedItems, loading]);

  // Jump to a specific row (scroll + highlight + expand + load history)
  // This is used by the edit toast to jump to the updated row
  const jumpToRow = useCallback(async (groupKey: string) => {
    // Find the group
    const group = groupedItems.find(g => g.groupKey === groupKey);
    if (!group) return;
    
    // 1. Scroll to the row
    const rowElement = document.getElementById(`row-${groupKey}`);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // 2. Highlight the row
    setHighlightedGroupKeys(new Set([groupKey]));
    setTimeout(() => setHighlightedGroupKeys(new Set()), 6000); // Highlight for 6 seconds
    
    // 3. Expand the row
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      newSet.add(groupKey);
      return newSet;
    });
    
    // 4. Wait a bit then load action history
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 5. Load action history for all items in the group
    try {
      const historyPromises = group.items.map(item => 
        api.actionHistory.getByMailItem(item.mail_item_id)
      );
      const histories = await Promise.all(historyPromises);
      const combinedHistory = histories.flat().sort((a, b) => 
        new Date(a.action_timestamp).getTime() - new Date(b.action_timestamp).getTime()
      );
      setActionHistory(prev => ({
        ...prev,
        [groupKey]: combinedHistory
      }));
    } catch (err) {
      console.error('Failed to load action history:', err);
    }
  }, [groupedItems]);

  // Sorting for grouped items
  const sortedGroups = [...groupedItems].sort((a, b) => {
    let comparison = 0;
    
    switch (sortColumn) {
      case 'date':
        comparison = new Date(a.latestReceivedDate).getTime() - new Date(b.latestReceivedDate).getTime();
        break;
      case 'status':
        comparison = a.displayStatus.localeCompare(b.displayStatus);
        break;
      case 'customer': {
        const nameA = a.contact?.contact_person || a.contact?.company_name || '';
        const nameB = b.contact?.contact_person || b.contact?.company_name || '';
        comparison = nameA.localeCompare(nameB);
        break;
      }
      case 'type':
        comparison = a.itemType.localeCompare(b.itemType);
        break;
      case 'quantity':
        comparison = a.totalQuantity - b.totalQuantity;
        break;
      case 'lastNotified': {
        // Find the most recent last_notified from items in each group
        const lastNotifiedA = a.items.reduce((latest, item) => {
          if (!item.last_notified) return latest;
          const itemDate = new Date(item.last_notified).getTime();
          return itemDate > latest ? itemDate : latest;
        }, 0);
        const lastNotifiedB = b.items.reduce((latest, item) => {
          if (!item.last_notified) return latest;
          const itemDate = new Date(item.last_notified).getTime();
          return itemDate > latest ? itemDate : latest;
        }, 0);
        
        // Always push empty values to the bottom (regardless of sort direction)
        if (lastNotifiedA === 0 && lastNotifiedB === 0) {
          comparison = 0;
        } else if (lastNotifiedA === 0) {
          // A is empty, put it after B (positive = A goes down)
          return 1;
        } else if (lastNotifiedB === 0) {
          // B is empty, put it after A (negative = A goes up)
          return -1;
        } else {
          // Both have values, compare normally
          comparison = lastNotifiedA - lastNotifiedB;
        }
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
      <div className="max-w-full mx-auto px-16 py-6">
        <div className="flex flex-col items-center justify-center py-20">
          {/* Spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-green-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-gray-700">Loading mail log...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'max-w-7xl mx-auto px-6 py-8'}>
      {/* Header - only show if not embedded */}
      {!embedded && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Mail Log</h1>
            <button
              onClick={() => navigate('/dashboard/scan')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan Mail
            </button>
          </div>
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
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">Select the date the mail was received</p>
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
                onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
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

          {/* Staff Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who is logging this mail? *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLoggedBy('Madison')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  loggedBy === 'Madison'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Madison
              </button>
              <button
                type="button"
                onClick={() => setLoggedBy('Merlin')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  loggedBy === 'Merlin'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Merlin
              </button>
            </div>
            {!loggedBy && (
              <p className="mt-1 text-xs text-red-600">Please select who is logging this mail</p>
            )}
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
            disabled={addingMail || !selectedContact || !loggedBy}
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
          Showing <span className="font-semibold text-gray-900">{sortedGroups.length}</span> groups{' '}
          (<span className="font-semibold text-gray-900">{filteredItems.length}</span> items) of{' '}
          <span className="font-semibold text-gray-900">{mailItems.length}</span> total
        </p>
        <p className="text-sm text-gray-500 italic">
          💡 Items grouped by customer, date, and type. Click to expand.
        </p>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="overflow-x-auto">
        {sortedGroups.length === 0 ? (
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
                
                {/* Last Notified Column - Sortable */}
                <th 
                  className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort('lastNotified')}
                >
                  <div className="flex items-center gap-2">
                    Last Notified
                    {sortColumn === 'lastNotified' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </th>
                
                {/* Non-sortable columns */}
                  <th className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700">Notes</th>
                  <th className="text-left py-2.5 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map((group) => (
                  <React.Fragment key={group.groupKey}>
                    {/* Main Row - Clickable to expand */}
                    <tr 
                      id={`row-${group.groupKey}`}
                      data-group-key={group.groupKey}
                      className={`group border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                        highlightedGroupKeys.has(group.groupKey) ? 'animate-flash-green' : ''
                      }`}
                      onClick={() => toggleGroupRow(group)}
                    >
                    <td className="py-3 px-4">
                      <button
                        className="text-gray-500 hover:text-gray-700 transition-transform pointer-events-none"
                        style={{
                          transform: expandedRows.has(group.groupKey) ? 'rotate(90deg)' : 'rotate(0deg)',
                          display: 'inline-block',
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      <span 
                        title={`${group.items.length} item${group.items.length > 1 ? 's' : ''} on this date`}
                        className="cursor-help border-b border-dotted border-gray-400"
                      >
                        {new Date(group.date + 'T12:00:00').toLocaleDateString('en-US', {
                          timeZone: 'America/New_York',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </span>
                      {group.items.length > 1 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({group.items.length} entries)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        {group.itemType === 'Package' || group.itemType === 'Large Package' ? (
                          <Package className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Mail className="w-4 h-4 text-gray-500" />
                        )}
                        <span>{group.itemType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900 font-semibold">
                      {group.totalQuantity}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">
                          {group.contact?.contact_person || group.contact?.company_name || 'Unknown'}
                        </span>
                        {group.contactId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/contacts/${group.contactId}`);
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
                      {group.statuses.length === 1 ? (
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                          group.displayStatus === 'Received' ? 'bg-blue-100 text-blue-700' :
                          group.displayStatus === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          group.displayStatus === 'Notified' ? 'bg-purple-100 text-purple-700' :
                          group.displayStatus === 'Picked Up' ? 'bg-green-100 text-green-700' :
                          group.displayStatus === 'Scanned Document' ? 'bg-cyan-100 text-cyan-700' :
                          group.displayStatus === 'Scanned' ? 'bg-cyan-100 text-cyan-700' :
                          group.displayStatus === 'Forward' ? 'bg-orange-100 text-orange-700' :
                          group.displayStatus === 'Abandoned Package' ? 'bg-red-100 text-red-700' :
                          group.displayStatus === 'Abandoned' ? 'bg-red-100 text-red-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                          {group.displayStatus === 'Scanned Document' ? 'Scanned' : 
                           group.displayStatus === 'Abandoned Package' ? 'Abandoned' : 
                           group.displayStatus}
                      </span>
                      ) : (
                        <span className="px-3 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                          Mixed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {(() => {
                        // Find the most recent notification in the group
                        const lastNotified = group.items
                          .filter(item => item.last_notified)
                          .sort((a, b) => new Date(b.last_notified!).getTime() - new Date(a.last_notified!).getTime())[0]?.last_notified;
                        return lastNotified ? (
                          new Date(lastNotified).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                        ) : '—';
                      })()}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {group.hasDescription ? (
                        <span title="Has notes - expand to view">📝</span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
                        {/* Edit button - always visible for quick access */}
                          <button
                          onClick={() => openEditModal(group.items[0])}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        
                        {/* More Actions - works on first item in group */}
                        <div className="relative">
                          <button
                            id={`more-btn-${group.groupKey}`}
                            onClick={(_e) => {
                              setOpenDropdownId(openDropdownId === group.groupKey ? null : group.groupKey);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {openDropdownId === group.groupKey && (
                            <>
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={() => setOpenDropdownId(null)}
                              ></div>
                              
                              <div 
                                className="fixed w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-40 max-h-96 overflow-y-auto"
                                style={{
                                  top: `${(document.getElementById(`more-btn-${group.groupKey}`)?.getBoundingClientRect().bottom ?? 0) + 4}px`,
                                  right: `${window.innerWidth - (document.getElementById(`more-btn-${group.groupKey}`)?.getBoundingClientRect().right ?? 0)}px`,
                                }}
                              >
                                <button
                                  onClick={() => {
                                    openSendEmailModal(group.items[0]);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-3"
                                >
                                  <Send className="w-4 h-4 text-blue-600" />
                                  Send Email
                                </button>
                                
                                {/* Mark as Scanned */}
                                <button
                                  onClick={() => {
                                    setActionMailItem(group.items[0]);
                                    setActionModalType('scanned');
                                    setIsActionModalOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-cyan-50 flex items-center gap-3"
                                >
                                  <FileText className="w-4 h-4 text-cyan-600" />
                                  Mark as Scanned
                                </button>
                                
                                {/* Mark as Picked Up */}
                                <button
                                  onClick={() => {
                                    setActionMailItem(group.items[0]);
                                    setActionModalType('picked_up');
                                    setIsActionModalOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 flex items-center gap-3"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  Mark as Picked Up
                                </button>
                                
                                {/* Mark as Forward */}
                                <button
                                  onClick={() => {
                                    setActionMailItem(group.items[0]);
                                    setActionModalType('forward');
                                    setIsActionModalOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-3"
                                >
                                  <Send className="w-4 h-4 text-orange-600" />
                                  Mark as Forward
                                </button>
                                
                                {/* Mark as Abandoned */}
                                <button
                                  onClick={() => {
                                    setActionMailItem(group.items[0]);
                                    setActionModalType('abandoned');
                                    setIsActionModalOpen(true);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 flex items-center gap-3"
                                >
                                  <AlertTriangle className="w-4 h-4 text-red-600" />
                                  Mark as Abandoned
                                </button>
                                
                                <div className="border-t border-gray-200 my-1"></div>
                                
                                {group.contactId && (
                                  <button
                                    onClick={() => {
                                      navigate(`/dashboard/contacts/${group.contactId}`);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                  >
                                    <Eye className="w-4 h-4 text-gray-600" />
                                    View Customer Profile
                                  </button>
                                )}
                                
                                <div className="border-t border-gray-200 my-1"></div>
                                
                                {/* Delete - destructive action at bottom */}
                                <button
                                  onClick={() => {
                                    handleDelete(group.items[0].mail_item_id);
                                    setOpenDropdownId(null);
                                  }}
                                  disabled={deletingItemId === group.items[0].mail_item_id}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 disabled:opacity-50"
                                >
                                  {deletingItemId === group.items[0].mail_item_id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Details - Shows all items in group */}
                  {expandedRows.has(group.groupKey) && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan={9} className="py-6 px-4">
                        <div className="space-y-6">
                          {/* Combined Action History Timeline */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3">Action History</h3>
                            <ActionHistorySection
                              actions={getGroupActionHistory(group)}
                              loading={false}
                            />
                          </div>

                          {/* Mail Item Details */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3">Customer Details</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Mailbox:</span>
                                <span className="ml-2 text-gray-900 font-medium">
                                  {group.contact?.mailbox_number || 'N/A'}
                                </span>
                              </div>
                              {group.contact?.unit_number && (
                                <div>
                                  <span className="text-gray-600">Unit:</span>
                                  <span className="ml-2 text-gray-900 font-medium">
                                    {group.contact.unit_number}
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

      {sortedGroups.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {sortedGroups.length} groups ({filteredItems.length} items) of {mailItems.length} total
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
                required
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">Select the date the mail was received</p>
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
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, performed_by: 'Madison' }))}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        formData.performed_by === 'Madison'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      👤 Madison
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, performed_by: 'Merlin' }))}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        formData.performed_by === 'Merlin'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      👤 Merlin
                    </button>
                  </div>
                  {!formData.performed_by && (
                    <p className="mt-1 text-xs text-red-600">Please select who is making this change</p>
                  )}
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

      {/* Duplicate prompt modal removed - now auto-adds to existing items */}
    </div>
  );
}
