import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import WaiveFeeModal from '../components/WaiveFeeModal.tsx';
import CollectFeeModal from '../components/CollectFeeModal.tsx';
import { getTodayNY, toNYDateString } from '../utils/timezone.ts';
import { format } from 'date-fns';
import { DollarSign, Package, ChevronDown, ChevronUp, Banknote, Loader2 } from 'lucide-react';

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
  };
}

interface GroupedFee {
  contact: {
    contact_id: string;
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
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
    await new Promise(resolve => setTimeout(resolve, 200));
    
    loadFees();
    setIsCollectFeeModalOpen(false);
    
    if (collectingGroup) {
      const customerName = collectingGroup.contact.contact_person || 
                          collectingGroup.contact.company_name || 
                          'Customer';
      
      if (action === 'collected') {
        toast.success(`💰 Fee collected from ${customerName}`);
      } else if (action === 'waived') {
        toast.success(`✅ Fee waived for ${customerName}`);
      }
    }
    
    setCollectingGroup(null);
  };

  // Calculate total outstanding fees
  const totalOutstanding = feesData.reduce((sum, group) => sum + group.totalFees, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-10 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Fee Collection
          </h1>
        </div>
        <p className="text-gray-600 ml-5">Manage and collect outstanding package storage fees</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-700">Total Outstanding</p>
              <p className="text-4xl font-bold text-gray-900">${totalOutstanding.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-700 font-medium">{feesData.length} customers</p>
            <p className="text-sm text-gray-600">with pending fees</p>
          </div>
        </div>
      </div>

      {/* Fees List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : feesData.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No outstanding fees to collect at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feesData.map((group) => {
            const customerName = group.contact.contact_person || 
                               group.contact.company_name || 
                               'Unknown Customer';
            const totalItems =
              group.packages.reduce((sum, pkg) => sum + (pkg.quantity || 1), 0) +
              group.letters.reduce((sum, letter) => sum + (letter.quantity || 1), 0);
            
            // Calculate oldest item age
            const allItems = [...group.packages, ...group.letters];
            const oldestDays = Math.max(
              ...allItems.map(item => getDaysSince(item.received_date))
            );
            const isPersonExpanded = expandedPersons.has(group.contact.contact_id);
            
            return (
              <div
                key={group.contact.contact_id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div 
                  className="p-5 cursor-pointer"
                  onClick={() => togglePersonExpand(group.contact.contact_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-lg">{customerName}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePersonExpand(group.contact.contact_id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {isPersonExpanded ? 
                              <ChevronUp className="w-4 h-4 text-gray-600" /> : 
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            }
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                            📮 {group.contact.mailbox_number || 'No mailbox'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                          </span>
                          <span className={`text-sm font-medium ${oldestDays >= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
                            • {oldestDays} days
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Fee Amount */}
                    <div className="text-right bg-gradient-to-br from-orange-50 to-amber-50 px-5 py-3 rounded-xl border border-orange-200">
                      <p className="text-3xl font-bold text-orange-600">
                        ${group.totalFees.toFixed(2)}
                      </p>
                      <p className="text-xs text-orange-700 font-medium">storage fees</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isPersonExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    {/* Package details */}
                    {group.packages.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <Package className="w-4 h-4 text-gray-600" />
                          <span className="font-semibold text-gray-900">
                            {group.packages.length} package{group.packages.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="ml-6 space-y-2">
                          {group.packages.map(pkg => {
                            const days = getDaysSince(pkg.received_date);
                            const fee = pkg.packageFee?.fee_amount || 0;
                            const feeStatus = pkg.packageFee?.fee_status;
                            const isWaived = feeStatus === 'waived';
                            const isPaid = feeStatus === 'paid';
                            const receivedDateStr = format(new Date(pkg.received_date), 'MMM d');
                            
                            return (
                              <div key={pkg.mail_item_id} className="text-sm bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-gray-900 font-medium">
                                      Received {receivedDateStr}
                                    </span>
                                    <span className="text-gray-500 ml-2">({days} days ago)</span>
                                  </div>
                                  <div className={`font-semibold ${
                                    isWaived ? 'text-blue-600 line-through' :
                                    isPaid ? 'text-green-600' :
                                    'text-orange-600'
                                  }`}>
                                    ${fee.toFixed(2)}
                                    {isPaid && ' ✓'}
                                    {isWaived && ' (waived)'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="px-5 pb-5 flex items-center gap-3">
                  <button
                    onClick={() => openCollectFeeModal(group)}
                    className="flex-1 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Banknote className="w-5 h-5" />
                    Collect ${group.totalFees >= 50 ? group.totalFees.toFixed(0) : group.totalFees.toFixed(2)}
                  </button>
                  <button
                    onClick={() => openWaiveFeeModal(group)}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Waive
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/contacts/${group.contact.contact_id}`)}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Profile
                  </button>
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

