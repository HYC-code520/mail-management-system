import React, { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';

interface QuickNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailItemId: string;
  contactId: string;
  customerName: string;
  onSuccess: () => void;
}

export default function QuickNotifyModal({
  isOpen,
  onClose,
  mailItemId,
  contactId,
  customerName,
  onSuccess
}: QuickNotifyModalProps) {
  const [notifiedBy, setNotifiedBy] = useState('');
  const [notificationMethod, setNotificationMethod] = useState('Email');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!notifiedBy.trim()) {
      toast.error('Please enter who notified the customer');
      return;
    }

    setLoading(true);

    try {
      await api.notifications.quickNotify({
        mail_item_id: mailItemId,
        contact_id: contactId,
        notified_by: notifiedBy,
        notification_method: notificationMethod,
        ...(notes && { notes })
      });

      toast.success(`✓ ${customerName} notified via ${notificationMethod}`);
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to log notification:', err);
      toast.error('Failed to log notification');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNotifiedBy('');
    setNotificationMethod('Email');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Mark as Notified</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Customer:</p>
            <p className="font-semibold text-gray-900">{customerName}</p>
          </div>

          {/* Who Notified */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Who notified? <span className="text-red-500">*</span>
            </label>
            <select
              value={notifiedBy}
              onChange={(e) => setNotifiedBy(e.target.value)}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select staff member...</option>
              <option value="Merlin">Merlin</option>
              <option value="Madison">Madison</option>
            </select>
          </div>

          {/* Notification Method */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              How did you notify? <span className="text-red-500">*</span>
            </label>
            <select
              value={notificationMethod}
              onChange={(e) => setNotificationMethod(e.target.value)}
              required
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Email">Email</option>
              <option value="Phone">Phone Call</option>
              <option value="Text">Text Message</option>
              <option value="WeChat">WeChat</option>
              <option value="In-Person">In-Person</option>
            </select>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Mark as Notified'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

