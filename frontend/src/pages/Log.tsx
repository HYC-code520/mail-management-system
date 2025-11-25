import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, Search, ChevronRight, X, Calendar, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Edit, Trash2, Bell, CheckCircle, FileText, Send, AlertTriangle, Eye, MoreVertical } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';
import QuickNotifyModal from '../components/QuickNotifyModal.tsx';

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

interface NotificationHistory {
  notification_id: string;
  notified_by: string;
  notification_method: string;
  notified_at: string;
  notes?: string;
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
  const [notificationHistory, setNotificationHistory] = useState<Record<string, NotificationHistory[]>>({});
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
  
  // Form data
  const [formData, setFormData] = useState({
    contact_id: '',
    item_type: 'Package',
    description: '',
    status: 'Received',
    received_date: '',
    quantity: 1
  });
  
  // Add form states (for showAddForm)
  // Get today's date in local timezone (not UTC)
  const getTodayLocal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [date, setDate] = useState(getTodayLocal());
  const [itemType, setItemType] = useState('Letter');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingMail, setAddingMail] = useState(false);

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
  useEffect(() => {
    if (showAddForm && searchQuery.length >= 2) {
      searchContacts();
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery, showAddForm]);

  const searchContacts = async () => {
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
  };

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

    setAddingMail(true);

    try {
      await api.mailItems.create({
        contact_id: selectedContact.contact_id,
        item_type: itemType,
        description: note,
        status: 'Received',
        quantity: quantity,
        received_date: date // Use the selected date from the form
      });

      toast.success(`${quantity} mail item(s) added successfully!`);
      
      // Reset form
      setItemType('Letter');
      setQuantity(1);
      setNote('');
      setSearchQuery('');
      setSelectedContact(null);
      setDate(getTodayLocal()); // Use local date helper
      
      // Reload mail items
      loadMailItems();
    } catch (err) {
      console.error('Error creating mail item:', err);
      toast.error('Failed to add mail item');
    } finally {
      setAddingMail(false);
    }
  };

  const openEditModal = (mailItem: MailItem) => {
    setEditingMailItem(mailItem);
    setFormData({
      contact_id: mailItem.contact_id || '',
      item_type: mailItem.item_type || 'Package',
      description: mailItem.description || '',
      status: mailItem.status || 'Received',
      received_date: mailItem.received_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      quantity: (mailItem as any).quantity || 1
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
      quantity: 1
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
        await api.mailItems.update(editingMailItem.mail_item_id, formData);
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

  const openQuickNotifyModal = (item: MailItem) => {
    setNotifyingMailItem(item);
    setIsQuickNotifyModalOpen(true);
  };

  const handleQuickNotifySuccess = () => {
    loadMailItems();
  };

  const loadNotificationHistory = async (mailItemId: string) => {
    try {
      const history = await api.notifications.getByMailItem(mailItemId);
      setNotificationHistory(prev => ({
        ...prev,
        [mailItemId]: history
      }));
    } catch (err) {
      console.error('Failed to load notification history:', err);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      // Load notification history when row is expanded
      if (!notificationHistory[id]) {
        loadNotificationHistory(id);
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
      case 'customer':
        const nameA = a.contacts?.contact_person || a.contacts?.company_name || '';
        const nameB = b.contacts?.contact_person || b.contacts?.company_name || '';
        comparison = nameA.localeCompare(nameB);
        break;
      case 'type':
        comparison = a.item_type.localeCompare(b.item_type);
        break;
      case 'quantity':
        const qtyA = a.quantity || 1;
        const qtyB = b.quantity || 1;
        comparison = qtyA - qtyB;
        break;
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
                max={getTodayLocal()}
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
                  <option>Scanned Document</option>
                  <option>Forward</option>
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
                    {/* Main Row */}
                    <tr className="group border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleRow(item.mail_item_id)}
                        className="text-gray-500 hover:text-gray-700 transition-transform"
                        style={{
                          transform: expandedRows.has(item.mail_item_id) ? 'rotate(90deg)' : 'rotate(0deg)',
                          display: 'inline-block',
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {new Date(item.received_date).toISOString().split('T')[0]}
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
                            onClick={() => navigate(`/dashboard/contacts/${item.contact_id}`)}
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
                        item.status === 'Forward' ? 'bg-orange-100 text-orange-700' :
                        item.status === 'Abandoned Package' ? 'bg-red-100 text-red-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {item.status}
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
                      <div className="flex items-center justify-end gap-2 text-sm">
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
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Separator */}
                        <div className="border-l border-gray-300 h-6 mx-1"></div>
                        
                        {/* More Actions Dropdown - on the far right */}
                        <div className="relative">
                          <button
                            id={`more-btn-${item.mail_item_id}`}
                            onClick={(e) => {
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
                                {/* Mark as Notified - Only for Received */}
                                {item.status === 'Received' && (
                                  <button
                                    onClick={() => {
                                      openQuickNotifyModal(item);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 flex items-center gap-3"
                                  >
                                    <Bell className="w-4 h-4 text-purple-600" />
                                    Mark as Notified
                                  </button>
                                )}
                                
                                {/* Mark as Scanned - Only for Received */}
                                {item.status === 'Received' && (
                                  <button
                                    onClick={() => {
                                      quickStatusUpdate(item.mail_item_id, 'Scanned Document', item.status);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-cyan-50 flex items-center gap-3"
                                  >
                                    <FileText className="w-4 h-4 text-cyan-600" />
                                    Mark as Scanned
                                  </button>
                                )}
                                
                                {/* Mark as Picked Up - For Received/Notified/Pending */}
                                {(item.status === 'Received' || item.status === 'Notified' || item.status === 'Pending') && (
                                  <button
                                    onClick={() => {
                                      quickStatusUpdate(item.mail_item_id, 'Picked Up', item.status);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-green-50 flex items-center gap-3"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Mark as Picked Up
                                  </button>
                                )}
                                
                                {/* Mark as Forward - For Notified/Pending */}
                                {(item.status === 'Notified' || item.status === 'Pending') && (
                                  <button
                                    onClick={() => {
                                      quickStatusUpdate(item.mail_item_id, 'Forward', item.status);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-3"
                                  >
                                    <Send className="w-4 h-4 text-orange-600" />
                                    Mark as Forward
                                  </button>
                                )}
                                
                                {/* Mark as Abandoned - For Received/Notified/Pending */}
                                {(item.status === 'Received' || item.status === 'Notified' || item.status === 'Pending') && (
                                  <button
                                    onClick={() => {
                                      quickStatusUpdate(item.mail_item_id, 'Abandoned Package', item.status);
                                      setOpenDropdownId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 flex items-center gap-3"
                                  >
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    Mark as Abandoned
                                  </button>
                                )}
                                
                                {/* Separator if there were actions above */}
                                {(item.status === 'Received' || item.status === 'Notified' || item.status === 'Pending') && (
                                  <div className="border-t border-gray-200 my-1"></div>
                                )}
                                
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
                                
                                {/* Status-specific messages for completed items */}
                                {item.status === 'Picked Up' && (
                                  <div className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                                      <CheckCircle className="w-4 h-4" />
                                      Completed
                                    </div>
                                    <p className="text-xs">Item has been picked up. No further action required.</p>
                                  </div>
                                )}
                                
                                {item.status === 'Scanned Document' && (
                                  <div className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-cyan-700 font-medium mb-1">
                                      <FileText className="w-4 h-4" />
                                      Document Scanned
                                    </div>
                                    <p className="text-xs">Document has been scanned and sent to customer.</p>
                                  </div>
                                )}
                                
                                {item.status === 'Forward' && (
                                  <div className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-orange-700 font-medium mb-1">
                                      <Send className="w-4 h-4" />
                                      Forwarded
                                    </div>
                                    <p className="text-xs">Mail has been forwarded to customer's address.</p>
                                  </div>
                                )}
                                
                                {item.status === 'Abandoned Package' && (
                                  <div className="px-4 py-3 text-sm text-gray-600 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                                      <AlertTriangle className="w-4 h-4" />
                                      Abandoned
                                    </div>
                                    <p className="text-xs">Package marked as abandoned. No further action required.</p>
                                  </div>
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
                          {/* Notification History - Only show if there are notifications */}
                          {notificationHistory[item.mail_item_id]?.length > 0 && (
                            <div>
                              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-purple-600" />
                                Notification History
                              </h3>
                              <div className="space-y-3">
                                {notificationHistory[item.mail_item_id].map((notif) => (
                                  <div key={notif.notification_id} className="bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-gray-900">
                                            {new Date(notif.notified_at).toLocaleString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric',
                                              hour: 'numeric',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </span>
                                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                            {notif.notification_method}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                          Notified by: <span className="font-medium text-gray-900">{notif.notified_by}</span>
                                        </p>
                                        {notif.notes && (
                                          <p className="text-sm text-gray-600 mt-1 italic">
                                            Note: {notif.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Mail Item Details */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3">Mail Item Details</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Received:</span>
                                <span className="ml-2 text-gray-900 font-medium">
                                  {new Date(item.received_date).toLocaleDateString()}
                                </span>
                              </div>
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
                max={getTodayLocal()}
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
              <option value="Scanned Document">Scanned Document</option>
              <option value="Forward">Forward</option>
              <option value="Abandoned Package">Abandoned Package</option>
            </select>
          </div>

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
    </div>
  );
}
