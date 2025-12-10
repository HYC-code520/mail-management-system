/**
 * Action History Section Component
 * 
 * Displays action history for a mail item with consistent styling across all pages.
 * Used in Mail Log page, Contact Detail page, and anywhere else action history is shown.
 */

import React from 'react';
import { Bell, CheckCircle, FileText, Send, AlertTriangle, Mail } from 'lucide-react';

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
  // Determine icon and color based on action type or description
  const getActionIcon = (action: ActionHistoryItem) => {
    const desc = action.action_description?.toLowerCase() || '';
    const type = action.action_type?.toLowerCase() || '';
    
    if (type.includes('fee waived') || desc.includes('waived')) {
      return <span className="text-blue-600">💰</span>;
    } else if (desc.includes('notified') || type.includes('notified')) {
      return <Bell className="w-4 h-4 text-purple-600" />;
    } else if (desc.includes('picked up')) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (desc.includes('scanned')) {
      return <FileText className="w-4 h-4 text-cyan-600" />;
    } else if (desc.includes('forward')) {
      return <Send className="w-4 h-4 text-orange-600" />;
    } else if (desc.includes('abandoned')) {
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
    return <Mail className="w-4 h-4 text-gray-600" />;
  };

  const getActionColor = (action: ActionHistoryItem) => {
    const desc = action.action_description?.toLowerCase() || '';
    const type = action.action_type?.toLowerCase() || '';
    
    if (type.includes('fee waived') || desc.includes('waived')) {
      return 'border-blue-200 bg-blue-50';
    } else if (desc.includes('picked up')) {
      return 'border-green-200 bg-green-50';
    } else if (desc.includes('abandoned')) {
      return 'border-red-200 bg-red-50';
    }
    return 'border-gray-200 bg-white';
  };

  if (loading) {
    return (
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-600" />
          Action History
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Bell className="w-5 h-5 text-purple-600" />
        Action History
      </h3>
      {actions.length > 0 ? (
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.action_id}
              className={`p-3 rounded-lg border ${getActionColor(action)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getActionIcon(action)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {action.action_type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(action.action_timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  {action.action_description && (
                    <p className="text-sm text-gray-700 mb-1">
                      {action.action_description}
                    </p>
                  )}
                  {action.notes && (
                    <p className="text-sm text-gray-600 italic">
                      {action.notes}
                    </p>
                  )}
                  {action.previous_value && action.new_value && (
                    <p className="text-xs text-gray-500 mt-1">
                      Changed from: <span className="line-through">{action.previous_value}</span> → <span className="font-medium">{action.new_value}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    By: {action.performed_by}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No actions recorded yet. Actions will appear here when staff perform operations on this mail item.
        </p>
      )}
    </div>
  );
}

