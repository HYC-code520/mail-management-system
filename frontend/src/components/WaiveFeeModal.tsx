/**
 * Waive Fee Modal Component
 * 
 * Allows staff to waive (forgive) package storage fees for customers.
 * Requires a reason to be provided for audit purposes.
 */

import React, { useState } from 'react';
import Modal from './Modal.tsx';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';

interface PackageFee {
  fee_id: string;
  mail_item_id: string;
  fee_amount: number;
  days_charged: number;
  fee_status: 'pending' | 'paid' | 'waived';
}

interface MailItem {
  mail_item_id: string;
  item_type: string;
  received_date: string;
  quantity?: number;
  packageFee?: PackageFee;
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

interface WaiveFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupedFollowUp | null;
  onSuccess: () => void;
}

export default function WaiveFeeModal({ isOpen, onClose, group, onSuccess }: WaiveFeeModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [waivedBy, setWaivedBy] = useState<string | null>(null); // NEW: Staff selection

  if (!group) return null;

  const customerName = group.contact.contact_person || group.contact.company_name || 'Customer';
  const pendingPackages = group.packages.filter(
    pkg => pkg.packageFee && pkg.packageFee.fee_status === 'pending'
  );

  const handleWaive = async () => {
    if (!reason || reason.trim().length < 5) {
      toast.error('Please provide a reason (at least 5 characters)');
      return;
    }
    
    if (!waivedBy) {
      toast.error('Please select who is waiving this fee');
      return;
    }

    setSaving(true);
    try {
      let waivedCount = 0;
      let totalWaived = 0;

      // Waive fees for all pending packages in this group
      for (const pkg of pendingPackages) {
        if (pkg.packageFee && pkg.packageFee.fee_status === 'pending') {
          await api.fees.waive(pkg.packageFee.fee_id, reason.trim());
          waivedCount++;
          totalWaived += pkg.packageFee.fee_amount;
        }
      }

      toast.success(
        `✅ Waived $${totalWaived.toFixed(2)} in fees for ${customerName} by ${waivedBy} (${waivedCount} package${waivedCount !== 1 ? 's' : ''})`,
        { duration: 5000 }
      );

      // Reset form
      setReason('');
      setWaivedBy(null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error waiving fees:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to waive fees';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setWaivedBy(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="💰 Waive Package Storage Fees">
      <div className="space-y-4">
        {/* Customer Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Waiving fees for:</p>
          <p className="text-lg font-bold text-gray-900">{customerName}</p>
          <p className="text-sm text-gray-600">📮 Mailbox: {group.contact.mailbox_number || 'N/A'}</p>
        </div>

        {/* Fee Summary */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Fees to Waive:</span>
            <span className="text-2xl font-bold text-orange-600">
              ${group.totalFees.toFixed(2)}
            </span>
          </div>
          
          {/* Package Details */}
          <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Packages ({pendingPackages.length}):</p>
            {pendingPackages.map(pkg => (
              <div key={pkg.mail_item_id} className="text-xs text-gray-600 ml-2">
                • Day {pkg.packageFee?.days_charged || 0} - ${(pkg.packageFee?.fee_amount || 0).toFixed(2)}
                {pkg.quantity && pkg.quantity > 1 && ` (×${pkg.quantity})`}
              </div>
            ))}
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for waiving fees: <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Goodwill gesture for loyal customer, System error, Customer complaint resolution, First-time courtesy..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
            disabled={saving}
          />
          <p className="text-xs text-gray-500 mt-1">
            {reason.length}/500 characters (minimum 5)
          </p>
        </div>

        {/* Staff Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Who is waiving this fee? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWaivedBy('Madison')}
              disabled={saving}
              className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                waivedBy === 'Madison'
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              } disabled:opacity-50`}
            >
              Madison
            </button>
            <button
              type="button"
              onClick={() => setWaivedBy('Merlin')}
              disabled={saving}
              className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                waivedBy === 'Merlin'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              } disabled:opacity-50`}
            >
              Merlin
            </button>
          </div>
          {!waivedBy && (
            <p className="mt-1 text-xs text-red-600">Please select who is waiving the fee</p>
          )}
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            ⚠️ <strong>This action cannot be undone.</strong> Waived fees will be marked as forgiven and will not be collected.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleWaive}
            disabled={!reason.trim() || reason.trim().length < 5 || saving}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Waiving...' : `Waive $${group.totalFees.toFixed(2)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

