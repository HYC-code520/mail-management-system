import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Package, Search, ChevronRight, X, Calendar, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';

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
  
  // Form data
  const [formData, setFormData] = useState({
    contact_id: '',
    item_type: 'Package',
    description: '',
    status: 'Received'
  });
  
  // Add form states (for showAddForm)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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
        quantity: quantity
      });

      toast.success(`${quantity} mail item(s) added successfully!`);
      
      // Reset form
      setItemType('Letter');
      setQuantity(1);
      setNote('');
      setSearchQuery('');
      setSelectedContact(null);
      setDate(new Date().toISOString().split('T')[0]);
      
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
      status: mailItem.status || 'Received'
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
      status: 'Received'
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      }
      closeModal();
      loadMailItems();
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

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
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
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Letter">Letter</option>
                <option value="Package">Package</option>
              </select>
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
                    <div className="font-medium text-gray-900">
                      {contact.contact_person || contact.company_name}
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
              <div className="mt-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-900">
                    {selectedContact.contact_person || selectedContact.company_name}
                  </div>
                  <div className="text-sm text-green-700">
                    {selectedContact.mailbox_number && `📮 ${selectedContact.mailbox_number}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContact(null);
                    setSearchQuery('');
                  }}
                  className="text-green-700 hover:text-green-900 transition-colors"
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
                  <option>Notified</option>
                  <option>Picked Up</option>
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
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
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700 w-10"></th>
                
                {/* Date Column - Sortable */}
                <th 
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
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
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
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
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
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
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
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
                  className="text-left py-3 px-6 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
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
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Last Notified</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Notes</th>
                <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <React.Fragment key={item.mail_item_id}>
                  {/* Main Row */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
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
                    <td className="py-4 px-6 text-gray-900">
                      {new Date(item.received_date).toISOString().split('T')[0]}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-700">
                        {item.item_type === 'Package' ? (
                          <Package className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Mail className="w-4 h-4 text-gray-500" />
                        )}
                        <span>{item.item_type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-900 font-semibold">
                      {item.quantity || 1}
                    </td>
                    <td className="py-4 px-6 text-gray-900">
                      {item.contacts?.contact_person || item.contacts?.company_name || 'Unknown'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded text-xs font-medium ${
                        item.status === 'Pending' ? 'bg-black text-white' :
                        item.status === 'Notified' ? 'bg-gray-200 text-gray-700' :
                        item.status === 'Picked Up' ? 'bg-gray-200 text-gray-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {item.last_notified || '—'}
                    </td>
                    <td className="py-4 px-6 text-gray-700">
                      {item.description || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm">
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
                    </td>
                  </tr>

                  {/* Expanded Row Details */}
                  {expandedRows.has(item.mail_item_id) && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan={8} className="py-6 px-6">
                        <div className="space-y-6">
                          {/* Notification History */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3">Notification History</h3>
                            <div className="space-y-2 text-sm text-gray-700">
                              <p>• 2025-11-10 9:00 AM - Email - Sent by Merlin</p>
                              <p>• 2025-11-10 1:00 PM - Phone - Sent by Madison</p>
                            </div>
                          </div>

                          {/* Follow-up Notes */}
                          <div>
                            <h3 className="font-bold text-gray-900 mb-3">Follow-up Notes</h3>
                            <div className="space-y-2 text-sm text-gray-700">
                              <p>• Customer picked up at 3:45 PM</p>
                              <p>• ID verified</p>
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
              {contacts.map(contact => (
                <option key={contact.contact_id} value={contact.contact_id}>
                  {contact.contact_person || contact.company_name} - {contact.mailbox_number}
                </option>
              ))}
            </select>
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
    </div>
  );
}
