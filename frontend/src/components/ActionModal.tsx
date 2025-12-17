import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailItemId: string;
  mailItemDetails: {
    customerName: string;
    itemType: string;
    currentStatus: string;
  };
  actionType: 'picked_up' | 'forward' | 'scanned' | 'abandoned';
  onSuccess: () => void;
}

const ACTION_CONFIG = {
  picked_up: {
    title: 'Mark as Picked Up',
    buttonText: 'Confirm Pick Up',
    statusValue: 'Picked Up',
    description: 'Marked as Picked Up',
    successMessage: 'marked as picked up'
  },
  forward: {
    title: 'Forward Mail',
    buttonText: 'Confirm Forward',
    statusValue: 'Forward',
    description: 'Forwarded',
    successMessage: 'marked as forwarded'
  },
  scanned: {
    title: 'Mark as Scanned',
    buttonText: 'Confirm Scan',
    statusValue: 'Scanned',
    description: 'Scanned',
    successMessage: 'marked as scanned'
  },
  abandoned: {
    title: 'Mark as Abandoned',
    buttonText: 'Confirm Abandoned',
    statusValue: 'Abandoned',
    description: 'Marked as Abandoned',
    successMessage: 'marked as abandoned'
  }
};

export default function ActionModal({
  isOpen,
  onClose,
  mailItemId,
  mailItemDetails,
  actionType,
  onSuccess
}: ActionModalProps) {
  const [performedBy, setPerformedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const config = ACTION_CONFIG[actionType];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!performedBy.trim()) {
      toast.error('Please select who performed this action');
      return;
    }

    setLoading(true);

    try {
      // Update the mail item status (backend automatically creates action history)
      await api.mailItems.update(mailItemId, {
        status: config.statusValue,
        performed_by: performedBy, // Pass staff name to backend for action history
        action_notes: notes.trim() || null // Pass notes to be included in action history
      });

      // Note: Backend automatically logs action history, no need to create it manually here

      toast.success(`✓ ${mailItemDetails.customerName}'s ${mailItemDetails.itemType} ${config.successMessage}`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to perform action:', err);
      toast.error('Failed to update mail item');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPerformedBy('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mail Item Info */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
            <div>
              <span className="text-sm text-gray-600">Customer: </span>
              <span className="font-semibold text-gray-900">{mailItemDetails.customerName}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Item: </span>
              <span className="font-medium text-gray-900">{mailItemDetails.itemType}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Current Status: </span>
              <span className="font-medium text-gray-900">{mailItemDetails.currentStatus}</span>
            </div>
          </div>

          {/* Who Performed Action */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Who performed this action? <span className="text-red-500">*</span>
            </label>
            <select
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
            >
              <option value="">Select staff member...</option>
              <option value="Merlin">Merlin</option>
              <option value="Madison">Madison</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="Add any additional details about this action..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : config.buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

