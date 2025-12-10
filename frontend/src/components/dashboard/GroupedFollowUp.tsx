/**
 * Grouped Follow-Up Component
 * 
 * Displays mail items that need follow-up, grouped by person.
 * Shows urgency indicators based on fees, abandonment, and age.
 * 
 * Urgency Priority:
 * 1. Packages with fees (orange border)
 * 2. Abandoned items 30+ days (red border)
 * 3. Regular items (gray border)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, Package, Mail, ChevronDown, ChevronUp, Send, MoreVertical } from 'lucide-react';

interface PackageFee {
  fee_id: string;
  mail_item_id: string;
  fee_amount: number;
  days_charged: number;
  fee_status: 'pending' | 'paid' | 'waived';
}

interface MailItem {
  mail_item_id: string;
  contact_id: string; // Added: needed for Dashboard compatibility
  item_type: string;
  status: string;
  received_date: string;
  quantity?: number;
  last_notified?: string;
  packageFee?: PackageFee;
  contacts?: {
    contact_person?: string;
    company_name?: string;
    mailbox_number?: string;
  };
}

interface GroupedFollowUp {
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

interface GroupedFollowUpProps {
  groups: GroupedFollowUp[];
  onWaiveFee: (group: GroupedFollowUp) => void;
  onSendEmail: (group: GroupedFollowUp) => void;
  getDaysSince: (date: string) => number;
  loading?: boolean;
}

export default function GroupedFollowUpSection({ 
  groups, 
  onWaiveFee, 
  onSendEmail, 
  getDaysSince, 
  loading 
}: GroupedFollowUpProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());

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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Need Follow-up</h2>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900">Need Follow-up</h2>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              0
            </span>
          </div>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-500">No customers need follow-up at this time</p>
          <p className="text-sm text-gray-400 mt-1">Great job staying on top of things!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-900">Need Follow-up</h2>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-full font-medium">
            {groups.length} {groups.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-3">
          {groups.slice(0, displayCount).map((group) => {
            const customerName = group.contact.contact_person || 
                               group.contact.company_name || 
                               'Unknown Customer';
            const hasFees = group.totalFees > 0;
            const totalItems = group.packages.length + group.letters.length;
            
            // Calculate oldest item age
            const allItems = [...group.packages, ...group.letters];
            const oldestDays = Math.max(
              ...allItems.map(item => getDaysSince(item.received_date))
            );
            const isAbandoned = oldestDays >= 30;
            const isUrgent = hasFees || isAbandoned;
            const isPersonExpanded = expandedPersons.has(group.contact.contact_id);
            
            return (
              <div
                key={group.contact.contact_id}
                onClick={() => togglePersonExpand(group.contact.contact_id)}
                className="p-4 rounded-lg border border-gray-300 transition-all bg-white cursor-pointer hover:shadow-md hover:border-gray-400"
              >
                {/* Header with customer name and fees */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-3 h-3 rounded-full ${
                      isAbandoned ? 'bg-red-600' :
                      hasFees ? 'bg-orange-500' :
                      'bg-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-lg">{customerName}</p>
                        <button
                          onClick={() => togglePersonExpand(group.contact.contact_id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title={isPersonExpanded ? "Collapse details" : "Expand details"}
                        >
                          {isPersonExpanded ? 
                            <ChevronUp className="w-4 h-4 text-gray-600" /> : 
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          }
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        📮 {group.contact.mailbox_number || 'No mailbox'} • {totalItems} item{totalItems !== 1 ? 's' : ''}
                        {!isPersonExpanded && ` • ${oldestDays} days old`}
                      </p>
                    </div>
                  </div>
                  
                  {hasFees && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">
                        💰 ${group.totalFees.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-600">storage fees</p>
                    </div>
                  )}
                </div>
                
                {/* Expandable details */}
                {isPersonExpanded && (
                  <div className="animate-fadeIn">
                    {/* Package details - Date-first format */}
                    {group.packages.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          Packages ({group.packages.length}){group.totalFees > 0 && ` - Total fees: $${group.totalFees.toFixed(2)}`}
                        </p>
                        <div className="ml-5 space-y-2">
                          {group.packages.map(pkg => {
                            const days = getDaysSince(pkg.received_date);
                            const fee = pkg.packageFee?.fee_amount || 0;
                            const feeStatus = pkg.packageFee?.fee_status;
                            const isGracePeriod = days <= 1;
                            const isWaived = feeStatus === 'waived';
                            const isPaid = feeStatus === 'paid';
                            const isApproachingAbandonment = days >= 28;
                            const isLongWait = days >= 14 && days < 28;
                            
                            // Format the date (e.g., "Nov 26")
                            const receivedDateStr = format(new Date(pkg.received_date), 'MMM d');
                            
                            return (
                              <div key={pkg.mail_item_id} className="text-sm">
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-900 font-medium">📦 Received {receivedDateStr}</span>
                                  <span className="text-gray-500">({days} day{days !== 1 ? 's' : ''} ago)</span>
                                </div>
                                <div className="ml-5 text-gray-600">
                                  {isGracePeriod ? (
                                    days === 0 ? (
                                      <span className="text-green-600 font-medium">Free (1 day included)</span>
                                    ) : (
                                      <span className="text-green-600 font-medium">Free (last day of included storage)</span>
                                    )
                                  ) : isWaived ? (
                                    <span className="text-blue-600 line-through">
                                      Storage fee: ${fee.toFixed(2)}
                                    </span>
                                  ) : isPaid ? (
                                    <span className="text-green-600 font-medium">
                                      Storage fee: ${fee.toFixed(2)} ✓ Paid
                                    </span>
                                  ) : (
                                    <span className={fee > 0 ? 'text-orange-600 font-medium' : ''}>
                                      Storage fee: ${fee.toFixed(2)}
                                    </span>
                                  )}
                                  {isWaived && <span className="text-blue-600"> (fee waived)</span>}
                                  {isApproachingAbandonment && !isWaived && !isPaid && (
                                    <span className="text-red-600 font-medium"> • ⚠️ Approaching abandonment</span>
                                  )}
                                  {isLongWait && !isWaived && !isPaid && !isApproachingAbandonment && (
                                    <span className="text-orange-600"> • ⚠️ Long wait</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Letter details */}
                    {group.letters.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          Letters ({group.letters.length}):
                        </p>
                        <p className="text-sm text-gray-600 ml-5">
                          • Oldest: {Math.max(...group.letters.map(l => getDaysSince(l.received_date)))} days
                        </p>
                      </div>
                    )}
                    
                    {/* Last notified */}
                    {group.lastNotified && (
                      <p className="text-xs text-gray-500 mb-3 ml-5">
                        📧 Last notified: {getDaysSince(group.lastNotified)} days ago
                      </p>
                    )}
                  </div>
                )}
                
                {/* Context-aware action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                  {/* Determine primary action based on urgency */}
                  {isAbandoned ? (
                    // Near abandonment (28+ days)
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendEmail(group);
                        }}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors bg-red-100 hover:bg-red-200 text-red-700"
                      >
                        <Send className="w-4 h-4" />
                        ⚠️ Final Notice
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                        title="Mark as abandoned (coming soon)"
                      >
                        📦 Mark Abandoned
                      </button>
                    </>
                  ) : hasFees && group.totalFees >= 50 ? (
                    // High fees (>= $50)
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendEmail(group);
                        }}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors bg-orange-100 hover:bg-orange-200 text-orange-700"
                      >
                        <Send className="w-4 h-4" />
                        📧 Fee Reminder (${group.totalFees.toFixed(0)})
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onWaiveFee(group);
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                      >
                        💰 Waive Fees
                      </button>
                    </>
                  ) : hasFees ? (
                    // Has fees but < $50
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendEmail(group);
                        }}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors bg-orange-50 hover:bg-orange-100 text-orange-600"
                      >
                        <Send className="w-4 h-4" />
                        📧 Package Fee Reminder
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onWaiveFee(group);
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                      >
                        💰 Waive Fees
                      </button>
                    </>
                  ) : (
                    // No fees - general reminder
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendEmail(group);
                        }}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors bg-blue-50 hover:bg-blue-100 text-blue-600"
                      >
                        <Send className="w-4 h-4" />
                        📧 Send Reminder
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/contacts/${group.contact.contact_id}`);
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                      >
                        📋 View Details
                      </button>
                    </>
                  )}
                  
                  {/* More options dropdown */}
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(
                          openDropdownId === group.contact.contact_id ? null : group.contact.contact_id
                        );
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {openDropdownId === group.contact.contact_id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/contacts/${group.contact.contact_id}`);
                            setOpenDropdownId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg"
                        >
                          👤 View Profile
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/dashboard/log', { state: { contactFilter: group.contact.contact_id } });
                            setOpenDropdownId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg"
                        >
                          📋 View Mail History
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Urgency badge */}
                {isAbandoned && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-red-700 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      ⚠️ ABANDONED: {oldestDays} days old - requires immediate attention
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Show more button */}
          {groups.length > displayCount && (
            <button
              onClick={() => setDisplayCount(displayCount + 10)}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Show {Math.min(10, groups.length - displayCount)} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

