import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import WaiveFeeModal from '../components/WaiveFeeModal.tsx';
import CollectFeeModal from '../components/CollectFeeModal.tsx';
import { getTodayNY, toNYDateString } from '../utils/timezone.ts';
import { format } from 'date-fns';
import { Package, ChevronDown, ChevronUp, Banknote, Search, SlidersHorizontal } from 'lucide-react';
import { getCustomerDisplayName } from '../utils/customerDisplay';

interface PackageFee {
  fee_id: string;
  mail_item_id: string;
  fee_amount: number;
  days_charged: number;
  fee_status: 'pending' | 'paid' | 'waived';
  paid_date?: string;
  waived_date?: string;
  waive_reason?: string;
}

interface MailItem {
  mail_item_id: string;
  item_type: string;
  status: string;
  received_date: string;
  pickup_date?: string;
  contact_id: string;
  quantity?: number;
  last_notified?: string;
  notification_count?: number;
  packageFee?: PackageFee;
  contacts?: {
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
    display_name_preference?: 'company' | 'person' | 'both' | 'auto';
  };
}

interface GroupedFee {
  contact: {
    contact_id: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
    display_name_preference?: 'company' | 'person' | 'both' | 'auto';
  };
  packages: MailItem[];
  letters: MailItem[];
  totalFees: number;
  urgencyScore: number;
  lastNotified?: string;
}

export default function FeesPage() {
  const navigate = useNavigate();
  const [feesData, setFeesData] = useState<GroupedFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());

  // Waive Fee Modal states
  const [isWaiveFeeModalOpen, setIsWaiveFeeModalOpen] = useState(false);
  const [waivingGroup, setWaivingGroup] = useState<GroupedFee | null>(null);

  // Collect Fee Modal states
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);
  const [collectingGroup, setCollectingGroup] = useState<GroupedFee | null>(null);

  const loadFees = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch ALL outstanding fees directly from the fees endpoint
      const outstandingFees = await api.fees.getOutstanding();
      
      // Group fees by contact
      const groupedByContact: { [contactId: string]: GroupedFee } = {};
      
      for (const fee of outstandingFees) {
        const contactId = fee.contacts?.contact_id || fee.mail_items?.contact_id;
        if (!contactId) continue;
        
        if (!groupedByContact[contactId]) {
          groupedByContact[contactId] = {
            contact: {
              contact_id: contactId,
              contact_person: fee.contacts?.contact_person,
              company_name: fee.contacts?.company_name,
              mailbox_number: fee.contacts?.mailbox_number,
              display_name_preference: fee.contacts?.display_name_preference,
            },
            packages: [],
            letters: [],
            totalFees: 0,
            urgencyScore: 0,
          };
        }
        
        // Create a mail item from the fee data
        const mailItem: MailItem = {
          mail_item_id: fee.mail_item_id,
          item_type: fee.mail_items?.item_type || 'Package',
          status: fee.mail_items?.status || 'Unknown',
          received_date: fee.mail_items?.received_date || '',
          contact_id: contactId,
          packageFee: {
            fee_id: fee.fee_id,
            mail_item_id: fee.mail_item_id,
            fee_amount: parseFloat(fee.fee_amount) || 0,
            days_charged: fee.days_charged || 0,
            fee_status: fee.fee_status,
          },
          contacts: fee.contacts,
        };
        
        // Add to packages array (fees are only for packages)
        groupedByContact[contactId].packages.push(mailItem);
        groupedByContact[contactId].totalFees += parseFloat(fee.fee_amount) || 0;
      }
      
      // Convert to array and sort by total fees (highest first)
      const groupsWithFees = Object.values(groupedByContact)
        .sort((a, b) => b.totalFees - a.totalFees);
      
      setFeesData(groupsWithFees);
    } catch (err) {
      console.error('Error loading fees:', err);
      toast.error('Failed to load fees data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFees();
  }, [loadFees]);

  const getDaysSince = (dateStr: string) => {
    const todayNY = getTodayNY();
    const todayDate = new Date(todayNY + 'T00:00:00');
    const itemDateNY = toNYDateString(dateStr);
    const itemDate = new Date(itemDateNY + 'T00:00:00');
    const diffTime = todayDate.getTime() - itemDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const togglePersonExpand = (contactId: string) => {
    setExpandedPersons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const openWaiveFeeModal = (group: GroupedFee) => {
    setWaivingGroup(group);
    setIsWaiveFeeModalOpen(true);
  };

  const handleWaiveFeeSuccess = () => {
    loadFees();
    setIsWaiveFeeModalOpen(false);
    setWaivingGroup(null);
    
    if (waivingGroup) {
      const customerName = waivingGroup.contact.contact_person || 
                          waivingGroup.contact.company_name || 
                          'Customer';
      toast.success(`✅ Fee waived for ${customerName}`);
    }
  };

  const openCollectFeeModal = (group: GroupedFee) => {
    setCollectingGroup(group);
    setIsCollectFeeModalOpen(true);
  };

  const handleCollectFeeSuccess = async (action: 'collected' | 'waived' | 'skipped') => {
    // Refresh data in background
    loadFees();
    
    // For 'collected' action, DON'T close the modal here - let the celebration overlay handle it
    // The modal will close itself after the celebration is done
    if (action !== 'collected') {
      // For waive/skip, close modal normally after a short delay
      await new Promise(resolve => setTimeout(resolve, 200));
      setIsCollectFeeModalOpen(false);
      
      if (collectingGroup) {
        const customerName = collectingGroup.contact.contact_person || 
                            collectingGroup.contact.company_name || 
                            'Customer';
        
        if (action === 'waived') {
          toast.success(`✅ Fee waived for ${customerName}`);
        }
      }
      
      setCollectingGroup(null);
    }
    // Note: For 'collected', the modal's handleCelebrationComplete will call onClose
  };

  // Calculate total outstanding fees
  const totalOutstanding = feesData.reduce((sum, group) => sum + group.totalFees, 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'urgent' | 'normal'>('all');

  // Filter fees based on search and status
  const filteredFees = feesData.filter(group => {
    const customerName = group.contact.contact_person || group.contact.company_name || '';
    const mailbox = group.contact.mailbox_number || '';
    const matchesSearch = searchQuery === '' || 
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mailbox.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    
    const oldestDays = Math.max(...group.packages.map(pkg => getDaysSince(pkg.received_date)));
    if (statusFilter === 'urgent') return matchesSearch && oldestDays >= 14;
    if (statusFilter === 'normal') return matchesSearch && oldestDays < 14;
    return matchesSearch;
  });

  // Count by status
  const urgentCount = feesData.filter(g => Math.max(...g.packages.map(p => getDaysSince(p.received_date))) >= 14).length;
  const normalCount = feesData.length - urgentCount;

  return (
    <div className="max-w-full mx-auto px-4 md:px-8 lg:px-16 py-6">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Fee Collection</h1>
          <span className="text-gray-400 text-lg">{feesData.length} customers</span>
        </div>
        
        {/* Total Outstanding Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
          <span className="text-sm text-green-700">Total Outstanding</span>
          <span className="text-lg font-bold text-green-700">${totalOutstanding.toFixed(2)}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${statusFilter === 'all' ? 'bg-white/20' : 'bg-gray-200'}`}>{feesData.length}</span>
        </button>
        <button
          onClick={() => setStatusFilter('urgent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'urgent'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Urgent <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${statusFilter === 'urgent' ? 'bg-white/20' : 'bg-gray-200'}`}>{urgentCount}</span>
        </button>
        <button
          onClick={() => setStatusFilter('normal')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'normal'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Normal <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${statusFilter === 'normal' ? 'bg-white/20' : 'bg-gray-200'}`}>{normalCount}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for customer, mailbox number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
          <SlidersHorizontal className="w-5 h-5" />
          Filters
        </button>
      </div>

      {/* Fees List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
          <div className="w-24 h-24">
            <img
              src="/mail-moving-animation.gif"
              alt="Loading mail animation"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="mt-4 text-base font-medium text-gray-600 animate-pulse">
            Loading fees...
          </p>
        </div>
      ) : filteredFees.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No Results Found' : 'All Caught Up!'}
          </h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search terms.' : 'No outstanding fees to collect at this time.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredFees.map((group) => {
            const customerName = getCustomerDisplayName(group.contact);
            const totalItems =
              group.packages.reduce((sum, pkg) => sum + (pkg.quantity || 1), 0) +
              group.letters.reduce((sum, letter) => sum + (letter.quantity || 1), 0);
            
            // Calculate oldest item age
            const allItems = [...group.packages, ...group.letters];
            const oldestDays = Math.max(
              ...allItems.map(item => getDaysSince(item.received_date))
            );
            const isPersonExpanded = expandedPersons.has(group.contact.contact_id);
            const isUrgent = oldestDays >= 14;
            
            return (
              <div
                key={group.contact.contact_id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Content */}
                <div className="flex">
                  {/* Left Side - Info */}
                  <div className="flex-1 p-5">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-green-600'}`}>
                        {isUrgent ? 'Urgent' : 'Pending'}
                      </span>
                    </div>
                    
                    {/* Customer ID/Name */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{customerName}</h3>
                    
                    {/* Stats Row */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">Mailbox</span>
                        <span className="text-gray-900 font-medium">{group.contact.mailbox_number || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">Amount</span>
                        <span className="text-gray-900 font-bold text-lg">${group.totalFees.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">Days Pending</span>
                        <span className={`font-medium ${oldestDays >= 30 ? 'text-red-600' : oldestDays >= 14 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {oldestDays} days
                        </span>
                      </div>
                    </div>
                    
                    {/* Package Details - Expandable */}
                    <div className="border-t border-gray-100 pt-3">
                      <button
                        onClick={() => togglePersonExpand(group.contact.contact_id)}
                        className="flex items-center justify-between w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-green-500'}`} />
                          <span className="text-sm font-medium text-gray-700">
                            {totalItems} package{totalItems !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {isPersonExpanded ? 
                          <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </button>
                      
                      {/* Expanded Package List */}
                      {isPersonExpanded && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200 ml-1">
                          {group.packages.map(pkg => {
                            const days = getDaysSince(pkg.received_date);
                            const fee = pkg.packageFee?.fee_amount || 0;
                            const feeStatus = pkg.packageFee?.fee_status;
                            const isWaived = feeStatus === 'waived';
                            const isPaid = feeStatus === 'paid';
                            const receivedDateStr = format(new Date(pkg.received_date), 'MMM d');
                            
                            return (
                              <div key={pkg.mail_item_id} className="flex items-center justify-between py-1.5 text-sm">
                                <div className="flex items-center gap-2">
                                  <Package className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-gray-600">{receivedDateStr}</span>
                                  <span className="text-gray-400 text-xs">({days}d)</span>
                                </div>
                                <span className={`font-medium ${
                                  isWaived ? 'text-gray-400 line-through' :
                                  isPaid ? 'text-green-600' :
                                  'text-gray-900'
                                }`}>
                                  ${fee.toFixed(2)}
                                  {isPaid && <span className="text-green-600 ml-1">✓</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openCollectFeeModal(group)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Banknote className="w-4 h-4" />
                        Collect
                      </button>
                      <button
                        onClick={() => openWaiveFeeModal(group)}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                      >
                        Waive
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/contacts/${group.contact.contact_id}`)}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                  
                  {/* Right Side - Illustration */}
                  <div className="w-40 flex-shrink-0 bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
                    <img 
                      src="/money-illustration.png" 
                      alt="Money illustration" 
                      className="w-full h-auto object-contain opacity-90"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Waive Fee Modal */}
      {waivingGroup && (
        <WaiveFeeModal
          isOpen={isWaiveFeeModalOpen}
          onClose={() => {
            setIsWaiveFeeModalOpen(false);
            setWaivingGroup(null);
          }}
          group={waivingGroup}
          onSuccess={handleWaiveFeeSuccess}
        />
      )}
      
      {/* Collect Fee Modal */}
      {collectingGroup && (
        <CollectFeeModal
          isOpen={isCollectFeeModalOpen}
          onClose={() => {
            setIsCollectFeeModalOpen(false);
            setCollectingGroup(null);
          }}
          group={collectingGroup}
          onSuccess={handleCollectFeeSuccess}
        />
      )}
    </div>
  );
}

