/**
 * Grouped Follow-Up Component
 * 
 * Displays mail items that need follow-up, grouped by person.
 * Modern card-based design inspired by job listing cards.
 * 
 * Urgency Priority:
 * 1. Packages with fees (orange/peach background)
 * 2. Abandoned items 30+ days (red/pink background)
 * 3. Regular items (gray/neutral background)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, Package, Mail, ChevronDown, Send, DollarSign, Clock, MapPin } from 'lucide-react';
import { getCustomerDisplayName } from '../../utils/customerDisplay';

interface PackageFee {
  fee_id: string;
  mail_item_id: string;
  fee_amount: number;
  days_charged: number;
  fee_status: 'pending' | 'paid' | 'waived';
}

interface MailItem {
  mail_item_id: string;
  contact_id: string;
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
    display_name_preference?: 'company' | 'person' | 'both' | 'auto';
  };
}

interface GroupedFollowUp {
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

interface GroupedFollowUpProps {
  groups: GroupedFollowUp[];
  onSendEmail: (group: GroupedFollowUp) => void;
  onMarkAbandoned: (group: GroupedFollowUp) => void;
  getDaysSince: (date: string) => number;
  loading?: boolean;
}

// Get background color based on urgency
const getCardColors = (isAbandoned: boolean, hasFees: boolean, oldestDays: number) => {
  if (isAbandoned) {
    return {
      bg: 'bg-gradient-to-br from-red-50 to-pink-50',
      border: 'border-red-200',
      dateBg: 'bg-red-100 text-red-700',
      accent: 'text-red-600'
    };
  }
  if (hasFees) {
    return {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      border: 'border-orange-200',
      dateBg: 'bg-orange-100 text-orange-700',
      accent: 'text-orange-600'
    };
  }
  if (oldestDays >= 14) {
    return {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      border: 'border-amber-200',
      dateBg: 'bg-amber-100 text-amber-700',
      accent: 'text-amber-600'
    };
  }
  if (oldestDays >= 7) {
    return {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      dateBg: 'bg-blue-100 text-blue-700',
      accent: 'text-blue-600'
    };
  }
  return {
    bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
    border: 'border-gray-200',
    dateBg: 'bg-gray-100 text-gray-700',
    accent: 'text-gray-600'
  };
};

export default function GroupedFollowUpSection({ 
  groups, 
  onSendEmail, 
  onMarkAbandoned,
  getDaysSince, 
  loading 
}: GroupedFollowUpProps) {
  const navigate = useNavigate();
  const [displayCount, setDisplayCount] = useState(12);
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
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-24 h-24">
          <img
            src="/mail-moving-animation.gif"
            alt="Loading mail animation"
            className="w-full h-full object-contain"
          />
        </div>
        <p className="mt-4 text-base font-medium text-gray-600 animate-pulse">
          Loading follow-ups...
        </p>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
        <p className="text-gray-600">No customers need follow-up at this time.</p>
        <p className="text-sm text-gray-500 mt-1">Great job staying on top of things! 🎉</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.slice(0, displayCount).map((group) => {
        const customerName = getCustomerDisplayName(group.contact);
        const hasFees = group.totalFees > 0;
        const totalItems =
          group.packages.reduce((sum, pkg) => sum + (pkg.quantity || 1), 0) +
          group.letters.reduce((sum, letter) => sum + (letter.quantity || 1), 0);
        
        // Calculate oldest item age
        const allItems = [...group.packages, ...group.letters];
        const oldestDays = Math.max(
          ...allItems.map(item => getDaysSince(item.received_date))
        );
        const isAbandoned = oldestDays >= 30;
        const isPersonExpanded = expandedPersons.has(group.contact.contact_id);
        const colors = getCardColors(isAbandoned, hasFees, oldestDays);
        
        // Get oldest item date for display
        const oldestItem = allItems.reduce((oldest, item) => {
          const itemDate = new Date(item.received_date);
          const oldestDate = new Date(oldest.received_date);
          return itemDate < oldestDate ? item : oldest;
        }, allItems[0]);
        const oldestDateStr = format(new Date(oldestItem.received_date), 'MMM d, yyyy');
        
        return (
          <div
            key={group.contact.contact_id}
            onClick={() => togglePersonExpand(group.contact.contact_id)}
            className={`relative rounded-2xl ${colors.bg} ${colors.border} border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer`}
          >
            {/* Top row: Date badge and expand indicator */}
            <div className="flex items-start justify-between mb-4">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${colors.dateBg}`}>
                {oldestDateStr}
              </span>
              <div
                className={`p-1.5 rounded-lg transition-all duration-200 ${isPersonExpanded ? 'bg-gray-900 rotate-180' : 'bg-white/50'}`}
                title={isPersonExpanded ? "Click to collapse" : "Click to expand"}
              >
                <ChevronDown className={`w-4 h-4 transition-colors ${isPersonExpanded ? 'text-white' : 'text-gray-500'}`} />
              </div>
            </div>

            {/* Customer info */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">
                📮 Mailbox {group.contact.mailbox_number || 'N/A'}
              </p>
              <h3 className="text-xl font-bold text-gray-900 leading-tight">
                {customerName}
              </h3>
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Item count tag */}
              <span className="px-3 py-1 bg-white/70 border border-gray-200 rounded-full text-xs font-medium text-gray-700">
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </span>
              
              {/* Age tag */}
              <span className={`px-3 py-1 bg-white/70 border rounded-full text-xs font-medium ${
                oldestDays >= 30 ? 'border-red-300 text-red-700' :
                oldestDays >= 14 ? 'border-orange-300 text-orange-700' :
                oldestDays >= 7 ? 'border-amber-300 text-amber-700' :
                'border-gray-200 text-gray-700'
              }`}>
                {oldestDays} days
              </span>
              
              {/* Package/Letter breakdown */}
              {group.packages.length > 0 && (
                <span className="px-3 py-1 bg-white/70 border border-gray-200 rounded-full text-xs font-medium text-gray-700">
                  📦 {group.packages.reduce((sum, pkg) => sum + (pkg.quantity || 1), 0)}
                </span>
              )}
              {group.letters.length > 0 && (
                <span className="px-3 py-1 bg-white/70 border border-gray-200 rounded-full text-xs font-medium text-gray-700">
                  ✉️ {group.letters.reduce((sum, letter) => sum + (letter.quantity || 1), 0)}
                </span>
              )}
              
              {/* Status tags */}
              {isAbandoned && (
                <span className="px-3 py-1 bg-red-100 border border-red-300 rounded-full text-xs font-medium text-red-700">
                  ⚠️ Abandoned
                </span>
              )}
            </div>

            {/* Expandable details - Table View */}
            {isPersonExpanded && (
              <div className="mb-4 animate-fadeIn">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <div className="col-span-4">Item</div>
                  <div className="col-span-3 text-center">Qty</div>
                  <div className="col-span-2 text-center">Age</div>
                  <div className="col-span-3 text-right">Fee</div>
                </div>
                
                {/* Package rows */}
                {group.packages.map((pkg) => {
                  const days = getDaysSince(pkg.received_date);
                  const fee = pkg.packageFee?.fee_amount || 0;
                  const feeStatus = pkg.packageFee?.fee_status;
                  const isWaived = feeStatus === 'waived';
                  const isPaid = feeStatus === 'paid';
                  const receivedDateStr = format(new Date(pkg.received_date), 'MMM d');
                  const qty = pkg.quantity || 1;
                  
                  return (
                    <div 
                      key={pkg.mail_item_id} 
                      className="grid grid-cols-12 gap-2 px-2 py-1.5 text-sm items-center"
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{receivedDateStr}</span>
                      </div>
                      <div className="col-span-3 text-center text-gray-600">{qty}</div>
                      <div className="col-span-2 text-center text-gray-600">
                        {days}d
                      </div>
                      <div className="col-span-3 text-right">
                        {fee > 0 ? (
                          <span className={isWaived ? 'text-gray-400 line-through' : 'text-gray-600'}>
                            ${fee.toFixed(2)}
                            {isPaid && <span className="text-green-600 ml-1">✓</span>}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Letter rows */}
                {group.letters.map((letter) => {
                  const days = getDaysSince(letter.received_date);
                  const receivedDateStr = format(new Date(letter.received_date), 'MMM d');
                  const qty = letter.quantity || 1;
                  
                  return (
                    <div 
                      key={letter.mail_item_id} 
                      className="grid grid-cols-12 gap-2 px-2 py-1.5 text-sm items-center"
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{receivedDateStr}</span>
                      </div>
                      <div className="col-span-3 text-center text-gray-600">{qty}</div>
                      <div className="col-span-2 text-center text-gray-600">
                        {days}d
                      </div>
                      <div className="col-span-3 text-right text-gray-300">—</div>
                    </div>
                  );
                })}
                
                {/* Footer with totals and last notified */}
                <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2">
                  <div className="flex items-center gap-3">
                    {group.packages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {group.packages.reduce((sum, pkg) => sum + (pkg.quantity || 1), 0)} pkg
                      </span>
                    )}
                    {group.letters.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {group.letters.reduce((sum, letter) => sum + (letter.quantity || 1), 0)} letters
                      </span>
                    )}
                  </div>
                  {group.lastNotified && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Notified {getDaysSince(group.lastNotified)}d ago
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Bottom row: Fees and info */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200/50">
              <div>
                {hasFees ? (
                  <div>
                    <p className={`text-2xl font-bold ${colors.accent}`}>
                      ${group.totalFees.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">storage fees</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">Box {group.contact.mailbox_number}</span>
                  </div>
                )}
              </div>
              
              <div className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isPersonExpanded 
                  ? 'bg-gray-200 text-gray-700' 
                  : 'bg-gray-900 text-white'
              }`}>
                {isPersonExpanded ? 'Click to collapse' : 'Click for details'}
              </div>
            </div>

            {/* Action buttons - shown when expanded */}
            {isPersonExpanded && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-200/50">
                {/* Fee button - if has fees */}
                {hasFees && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/dashboard/fees');
                    }}
                    className="px-3 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors bg-green-100 hover:bg-green-200 text-green-700 border border-green-200"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Collect
                  </button>
                )}
                
                {/* Send Email/Reminder button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendEmail(group);
                  }}
                  className={`px-3 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                    isAbandoned 
                      ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200' 
                      : hasFees 
                        ? 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200'
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isAbandoned ? 'Final Notice' : 'Remind'}
                </button>
                
                {/* Mark Abandoned button - if 30+ days */}
                {isAbandoned && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAbandoned(group);
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-medium transition-colors border border-gray-200"
                    title="Mark items 30+ days old as abandoned"
                  >
                    Abandon
                  </button>
                )}
                
                {/* View Profile button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/contacts/${group.contact.contact_id}`);
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-medium transition-colors border border-gray-200"
                >
                  Profile
                </button>
              </div>
            )}

            {/* Urgency warning - always visible for abandoned */}
            {isAbandoned && !isPersonExpanded && (
              <div className="mt-3 pt-3 border-t border-red-200/50">
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {oldestDays}+ days - requires immediate attention
                </p>
              </div>
            )}
          </div>
        );
      })}
      
      {/* Show more button */}
      {groups.length > displayCount && (
        <div className="md:col-span-2 xl:col-span-3">
          <button
            onClick={() => setDisplayCount(displayCount + 12)}
            className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl font-medium transition-colors border border-gray-200 shadow-sm"
          >
            Show {Math.min(12, groups.length - displayCount)} more customers
          </button>
        </div>
      )}
    </div>
  );
}
