/**
 * Action History Section Component
 *
 * Displays action history for a mail item with a timeline view.
 * Used in Mail Log page, Contact Detail page, and anywhere else action history is shown.
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { formatNYDate } from '../utils/timezone.ts';

interface ActionHistoryItem {
  action_id: string;
  action_type: string;
  action_description?: string;
  notes?: string;
  performed_by: string;
  action_timestamp: string;
  previous_value?: string;
  new_value?: string;
}

interface ActionHistorySectionProps {
  actions: ActionHistoryItem[];
  loading?: boolean;
}

export default function ActionHistorySection({ actions, loading }: ActionHistorySectionProps) {
  // Deduplicate bulk notification entries
  // When a bulk email is sent, each mail item gets its own action history entry
  // We want to show only one entry per bulk action (same timestamp, performer, action type, and notes)
  const deduplicateActions = (actions: ActionHistoryItem[]): ActionHistoryItem[] => {
    const seen = new Map<string, ActionHistoryItem>();
    
    for (const action of actions) {
      // Create a key based on timestamp (rounded to minute), performer, action type, and notes
      // This groups bulk actions together
      const timestamp = new Date(action.action_timestamp);
      const roundedTimestamp = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        timestamp.getMinutes()
      ).toISOString();
      
      const key = `${roundedTimestamp}|${action.performed_by}|${action.action_type}|${action.notes || ''}`;
      
      // Keep the first occurrence (or you could keep the one with most details)
      if (!seen.has(key)) {
        seen.set(key, action);
      }
    }
    
    // Convert back to array and sort by timestamp descending
    return Array.from(seen.values()).sort(
      (a, b) => new Date(b.action_timestamp).getTime() - new Date(a.action_timestamp).getTime()
    );
  };

  // Apply deduplication
  const deduplicatedActions = deduplicateActions(actions);

  // Get display name - should only be "Merlin", "Madison", or "Staff"
  const getDisplayName = (performedBy: string): string => {
    if (!performedBy) return 'Staff';
    return performedBy; // Should already be "Merlin" or "Madison" from backend
  };

  // Get dot color based on action type
  const getDotColor = (action: ActionHistoryItem) => {
    const desc = action.action_description?.toLowerCase() || '';
    const type = action.action_type?.toLowerCase() || '';

    if (type.includes('fee waived') || desc.includes('waived')) {
      return 'bg-blue-500';
    } else if (desc.includes('notified') || type.includes('notified')) {
      return 'bg-purple-500';
    } else if (desc.includes('picked up')) {
      return 'bg-green-500';
    } else if (desc.includes('scanned') || desc.includes('received')) {
      return 'bg-cyan-500';
    } else if (desc.includes('forward')) {
      return 'bg-orange-500';
    } else if (desc.includes('abandoned') || desc.includes('closed')) {
      return 'bg-red-500';
    } else if (desc.includes('created') || desc.includes('opened')) {
      return 'bg-green-500';
    }
    return 'bg-gray-400';
  };

  // Format date for timeline
  const formatDate = (timestamp: string) => {
    return {
      date: formatNYDate(new Date(timestamp), { month: 'short', day: 'numeric', year: 'numeric' }),
      time: formatNYDate(new Date(timestamp), { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  // Build action text
  const getActionText = (action: ActionHistoryItem) => {
    const actionType = action.action_type?.toLowerCase() || '';

    if (actionType.includes('notified')) {
      return 'sent a notification';
    } else if (actionType.includes('picked up') || actionType.includes('pickup')) {
      return 'marked as picked up';
    } else if (actionType.includes('scanned') || actionType.includes('received')) {
      return 'scanned the item';
    } else if (actionType.includes('fee waived') || actionType.includes('waived')) {
      return 'waived the fee';
    } else if (actionType.includes('fee collected') || actionType.includes('paid')) {
      return 'collected fee payment';
    } else if (actionType.includes('abandoned')) {
      return 'marked as abandoned';
    } else if (actionType.includes('forwarded')) {
      return 'forwarded the item';
    } else if (actionType.includes('updated') || actionType.includes('edited')) {
      return 'updated the record';
    } else if (actionType.includes('created')) {
      // Use action_description if available (e.g., "Letter logged (qty: 8)")
      if (action.action_description) {
        // Parse the description to create user-friendly text
        // Format from backend: "Letter logged (qty: 8)" or "Package logged (qty: 2) - Description"
        const desc = action.action_description;
        const qtyMatch = desc.match(/\(qty:\s*(\d+)\)/i);
        const typeMatch = desc.match(/^(Letter|Package)/i);

        if (qtyMatch && typeMatch) {
          const qty = parseInt(qtyMatch[1], 10);
          const itemType = typeMatch[1].toLowerCase();
          const plural = qty > 1 ? 's' : '';
          return `added ${qty} ${itemType}${plural}`;
        }
        // Fallback: just use the description as-is
        return desc.toLowerCase().replace(' logged', '');
      }
      return 'created the record';
    }
    return action.action_type || 'performed an action';
  };

  if (loading) {
    return (
      <div>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600" />
          Action History
        </h3>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-20 h-20">
            <img
              src="/mail-moving-animation.gif"
              alt="Loading action history"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="mt-3 text-sm text-gray-500 animate-pulse">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-600" />
        Action History
      </h3>
      {deduplicatedActions.length > 0 ? (
        <div className="relative">
          {deduplicatedActions.map((action, index) => {
            const { date, time } = formatDate(action.action_timestamp);
            const isLast = index === deduplicatedActions.length - 1;

            return (
              <div key={action.action_id} className="flex gap-4 pb-6">
                {/* Date column */}
                <div className="w-24 flex-shrink-0 text-right">
                  <span className="text-sm text-gray-500 font-medium">{date}</span>
                </div>

                {/* Timeline line and dot */}
                <div className="relative flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${getDotColor(action)} z-10 ring-4 ring-white`}></div>
                  {!isLast && (
                    <div className="w-0.5 bg-gray-200 flex-1 mt-1"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-2 -mt-0.5">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{getDisplayName(action.performed_by)}</span>
                    <span className="text-gray-600 text-sm">{getActionText(action)}</span>
                  </div>

                  {/* Message box - Show change details OR notes, avoid redundancy */}
                  {(action.notes || (action.previous_value && action.new_value)) && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {/* If we have previous/new values, show them cleanly */}
                      {action.previous_value && action.new_value ? (
                        <p className="text-sm text-gray-700">
                          <span className="line-through text-gray-500">{action.previous_value}</span>
                          {' → '}
                          <span className="font-medium">{action.new_value}</span>
                        </p>
                      ) : null}
                      
                      {/* Show notes if available */}
                      {action.notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          {action.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Time */}
                  <span className="text-xs text-gray-400 mt-1 block">{time}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No actions recorded yet.</p>
          <p className="text-xs text-gray-400 mt-1">Actions will appear here when staff perform operations.</p>
        </div>
      )}
    </div>
  );
}

