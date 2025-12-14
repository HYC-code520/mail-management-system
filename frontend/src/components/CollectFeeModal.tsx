/**
 * Collect Fee Modal Component
 * 
 * Allows staff to collect, waive, or skip package storage fees.
 * Used during pickup flow and standalone fee collection.
 */

import React, { useState, useEffect } from 'react';
import Modal from './Modal.tsx';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import { CreditCard, Banknote, Smartphone, CheckCircle, XCircle, ArrowRight, PackageCheck, Mail, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';

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

type PaymentMethod = 'cash' | 'card' | 'venmo' | 'zelle' | 'check' | 'other';

interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupedFollowUp | null;
  onSuccess: (action: 'collected' | 'waived' | 'skipped') => void;
  /** If true, marking as picked up after collection/waive/skip */
  isPickupFlow?: boolean;
  /** Callback to mark items as picked up after fee handling */
  onMarkPickedUp?: () => Promise<void>;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
  { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'venmo', label: 'Venmo', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'zelle', label: 'Zelle', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'check', label: 'Check', icon: <CheckCircle className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <ArrowRight className="w-4 h-4" /> },
];

export default function CollectFeeModal({ 
  isOpen, 
  onClose, 
  group, 
  onSuccess,
  isPickupFlow = false,
  onMarkPickedUp
}: CollectFeeModalProps) {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [waiveReason, setWaiveReason] = useState('');
  const [showWaiveInput, setShowWaiveInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markAsPickedUp, setMarkAsPickedUp] = useState(false);
  const [markLettersAsPickedUp, setMarkLettersAsPickedUp] = useState(true); // Default to true for convenience
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editedAmount, setEditedAmount] = useState('');
  const [collectedBy, setCollectedBy] = useState<'Madison' | 'Merlin' | ''>(''); // Staff selection
  const [fullUnpaidAmount, setFullUnpaidAmount] = useState<number | null>(null); // Total unpaid fees across ALL items
  const [loadingFullAmount, setLoadingFullAmount] = useState(false);

  // Fetch the customer's FULL unpaid fees (not just from Needs Follow-Up)
  useEffect(() => {
    if (!group || !isOpen) {
      setFullUnpaidAmount(null);
      return;
    }

    const fetchFullUnpaidFees = async () => {
      setLoadingFullAmount(true);
      try {
        const response = await api.fees.getUnpaidByContact(group.contact.contact_id);
        // API returns array directly, not wrapped in { fees: [...] }
        const feesArray = Array.isArray(response) ? response : (response.fees || []);
        const total = feesArray.reduce((sum: number, fee: any) => sum + (fee.fee_amount || 0), 0);
        setFullUnpaidAmount(total);
      } catch (error) {
        console.error('Error fetching full unpaid fees:', error);
        // Don't show error to user, just fail silently
        setFullUnpaidAmount(null);
      } finally {
        setLoadingFullAmount(false);
      }
    };

    fetchFullUnpaidFees();
  }, [group, isOpen]);

  if (!group) return null;

  const customerName = group.contact.contact_person || group.contact.company_name || 'Customer';
  const pendingPackages = group.packages.filter(
    pkg => pkg.packageFee && pkg.packageFee.fee_status === 'pending' && pkg.packageFee.fee_amount > 0
  );

  // Helper to get staff name for performed_by field
  const getPerformedBy = (): string => {
    // For collect flow, use the selected staff name
    if (collectedBy) return collectedBy;
    // For waive/skip flow or fallback, use email
    return user?.email || 'Staff';
  };

  // Calculate total fee - use edited amount if in edit mode, otherwise use original
  const displayAmount = isEditingAmount && editedAmount ? parseFloat(editedAmount) : group.totalFees;
  const finalAmount = isNaN(displayAmount) ? group.totalFees : displayAmount;

  const handleCollect = async () => {
    if (!collectedBy) {
      toast.error('Please select who collected the fee');
      return;
    }
    
    setSaving(true);
    try {
      // Collect fees for all pending packages in this group
      for (const pkg of pendingPackages) {
        if (pkg.packageFee) {
          await api.fees.markPaid(
            pkg.packageFee.fee_id, 
            paymentMethod,
            finalAmount / pendingPackages.length, // Split edited amount evenly across packages
            collectedBy
          );
        }
      }

      // If checkbox is checked or pickup flow, mark items as picked up
      const shouldMarkPickedUp = markAsPickedUp || (isPickupFlow && onMarkPickedUp);
      
      if (shouldMarkPickedUp) {
        // Mark all packages in this group as picked up
        for (const pkg of group.packages) {
          await api.mailItems.updateStatus(pkg.mail_item_id, 'Picked Up', collectedBy);
        }
        
        // Mark letters as picked up if checkbox is checked
        if (markLettersAsPickedUp && group.letters.length > 0) {
          for (const letter of group.letters) {
            await api.mailItems.updateStatus(letter.mail_item_id, 'Picked Up', collectedBy);
          }
        }
        
        // Show appropriate toast message
        const itemsMarked = markLettersAsPickedUp && group.letters.length > 0 
          ? 'all items' 
          : 'packages';
        toast.success(
          `💵 Collected $${finalAmount.toFixed(2)} via ${paymentMethod} & marked ${itemsMarked} as Picked Up`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `💵 Collected $${finalAmount.toFixed(2)} via ${paymentMethod} from ${customerName}`,
          { duration: 5000 }
        );
      }

      // If pickup flow callback provided, call it
      if (isPickupFlow && onMarkPickedUp) {
        await onMarkPickedUp();
      }

      resetForm();
      onSuccess('collected');
      onClose();
    } catch (error) {
      console.error('Error collecting fees:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to collect fees';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleWaive = async () => {
    if (!waiveReason || waiveReason.trim().length < 5) {
      toast.error('Please provide a reason (at least 5 characters)');
      return;
    }

    setSaving(true);
    try {
      let totalWaived = 0;

      for (const pkg of pendingPackages) {
        if (pkg.packageFee) {
          await api.fees.waive(pkg.packageFee.fee_id, waiveReason.trim());
          totalWaived += pkg.packageFee.fee_amount;
        }
      }

      // If checkbox is checked or pickup flow, mark items as picked up
      const shouldMarkPickedUp = markAsPickedUp || (isPickupFlow && onMarkPickedUp);
      
      if (shouldMarkPickedUp) {
        const performedBy = getPerformedBy();
        // Mark all packages in this group as picked up
        for (const pkg of group.packages) {
          await api.mailItems.updateStatus(pkg.mail_item_id, 'Picked Up', performedBy);
        }
        
        // Mark letters as picked up if checkbox is checked
        if (markLettersAsPickedUp && group.letters.length > 0) {
          for (const letter of group.letters) {
            await api.mailItems.updateStatus(letter.mail_item_id, 'Picked Up', performedBy);
          }
        }
        
        // Show appropriate toast message
        const itemsMarked = markLettersAsPickedUp && group.letters.length > 0 
          ? 'all items' 
          : 'packages';
        toast.success(
          `✅ Waived $${totalWaived.toFixed(2)} & marked ${itemsMarked} as Picked Up`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `✅ Waived $${totalWaived.toFixed(2)} for ${customerName}`,
          { duration: 5000 }
        );
      }

      // If pickup flow callback provided, call it
      if (isPickupFlow && onMarkPickedUp) {
        await onMarkPickedUp();
      }

      resetForm();
      onSuccess('waived');
      onClose();
    } catch (error) {
      console.error('Error waiving fees:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to waive fees';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // Skip fee collection - mark as unpaid debt
    setSaving(true);
    try {
      // If checkbox is checked or pickup flow, mark items as picked up
      const shouldMarkPickedUp = markAsPickedUp || (isPickupFlow && onMarkPickedUp);
      
      if (shouldMarkPickedUp) {
        const performedBy = getPerformedBy();
        // Mark all packages in this group as picked up
        for (const pkg of group.packages) {
          await api.mailItems.updateStatus(pkg.mail_item_id, 'Picked Up', performedBy);
        }
        
        // Mark letters as picked up if checkbox is checked
        if (markLettersAsPickedUp && group.letters.length > 0) {
          for (const letter of group.letters) {
            await api.mailItems.updateStatus(letter.mail_item_id, 'Picked Up', performedBy);
          }
        }
        
        // Show appropriate toast message
        const itemsMarked = markLettersAsPickedUp && group.letters.length > 0 
          ? 'all items' 
          : 'packages';
        toast.success(
          `⏭️ Skipped fee - marked ${itemsMarked} as Picked Up. $${group.totalFees.toFixed(2)} tracked as unpaid debt.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `⏭️ Skipped fee collection for ${customerName}. $${group.totalFees.toFixed(2)} marked as unpaid debt.`,
          { duration: 5000 }
        );
      }

      // If pickup flow callback provided, call it
      if (isPickupFlow && onMarkPickedUp) {
        await onMarkPickedUp();
      }

      resetForm();
      onSuccess('skipped');
      onClose();
    } catch (error) {
      console.error('Error skipping fees:', error);
      toast.error('Failed to process');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('cash');
    setWaiveReason('');
    setShowWaiveInput(false);
    setMarkAsPickedUp(false);
    setMarkLettersAsPickedUp(true); // Reset to default true
    setIsEditingAmount(false);
    setEditedAmount('');
    setCollectedBy('');
    // Note: fullUnpaidAmount is managed by useEffect, not reset here
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="💵 Package Fee Collection">
      <div className="space-y-4">
        {/* Customer Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">
            {isPickupFlow ? 'Picking up packages for:' : 'Collecting fees from:'}
          </p>
          <p className="text-lg font-bold text-gray-900">{customerName}</p>
          <p className="text-sm text-gray-600">📮 Mailbox: {group.contact.mailbox_number || 'N/A'}</p>
        </div>

        {/* Warning: Additional unpaid fees exist */}
        {!loadingFullAmount && fullUnpaidAmount !== null && fullUnpaidAmount > group.totalFees && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-900 mb-1">⚠️ Additional Fees Not Shown</p>
                <p className="text-sm text-amber-800 mb-2">
                  This customer owes <strong>${fullUnpaidAmount.toFixed(2)} total</strong>, but only <strong>${group.totalFees.toFixed(2)}</strong> is shown here (from items needing follow-up).
                </p>
                <p className="text-sm text-amber-800">
                  <strong>Additional ${(fullUnpaidAmount - group.totalFees).toFixed(2)}</strong> is from items that were:
                </p>
                <ul className="text-xs text-amber-700 ml-4 mt-1 space-y-0.5">
                  <li>• Already picked up (fee not collected)</li>
                  <li>• Recently notified (within 3 days)</li>
                  <li>• Abandoned (still owe storage fees)</li>
                </ul>
                <p className="text-sm font-bold text-amber-900 mt-2 bg-amber-100 p-2 rounded border border-amber-300">
                  💡 Consider collecting the full ${fullUnpaidAmount.toFixed(2)} if customer is present!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fee Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Outstanding:</span>
            {!isEditingAmount ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">
                  ${group.totalFees.toFixed(2)}
                </span>
                <button
                  onClick={() => {
                    setIsEditingAmount(true);
                    setEditedAmount(group.totalFees.toFixed(2));
                  }}
                  disabled={saving}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                  title="Edit amount (for discounts/adjustments)"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  disabled={saving}
                  className="w-24 px-2 py-1 text-xl font-bold text-green-600 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsEditingAmount(false);
                    setEditedAmount('');
                  }}
                  disabled={saving}
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          {isEditingAmount && parseFloat(editedAmount) < group.totalFees && (
            <p className="text-xs text-blue-600 mb-2">
              💡 Discount: ${(group.totalFees - parseFloat(editedAmount || '0')).toFixed(2)} off
            </p>
          )}
          
          {/* Package Details */}
          <div className="mt-3 space-y-1">
            <p className="text-xs font-semibold text-gray-700 uppercase">
              Packages with fees ({pendingPackages.length}):
            </p>
            {pendingPackages.map(pkg => (
              <div key={pkg.mail_item_id} className="text-xs text-gray-600 ml-2">
                • Day {pkg.packageFee?.days_charged || 0} - ${(pkg.packageFee?.fee_amount || 0).toFixed(2)}
                {pkg.quantity && pkg.quantity > 1 && ` (×${pkg.quantity})`}
              </div>
            ))}
          </div>
        </div>

        {/* Staff Selection - Who collected the fee */}
        {!showWaiveInput && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collected By: <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCollectedBy('Madison')}
                disabled={saving}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  collectedBy === 'Madison'
                    ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400 hover:bg-purple-50'
                } disabled:opacity-50`}
              >
                Madison
              </button>
              <button
                type="button"
                onClick={() => setCollectedBy('Merlin')}
                disabled={saving}
                className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                  collectedBy === 'Merlin'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                } disabled:opacity-50`}
              >
                Merlin
              </button>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        {!showWaiveInput && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  disabled={saving}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    paymentMethod === method.value
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {method.icon}
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mark as Picked Up Checkbox */}
        {!isPickupFlow && !showWaiveInput && (
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
              <input
                type="checkbox"
                checked={markAsPickedUp}
                onChange={(e) => setMarkAsPickedUp(e.target.checked)}
                disabled={saving}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Also mark as Picked Up
                </span>
              </div>
            </label>
            
            {/* Letter Pickup Sub-checkbox - Only show if customer has letters AND main checkbox is checked */}
            {markAsPickedUp && group.letters.length > 0 && (
              <label className="flex items-center gap-3 p-3 ml-6 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                <input
                  type="checkbox"
                  checked={markLettersAsPickedUp}
                  onChange={(e) => setMarkLettersAsPickedUp(e.target.checked)}
                  disabled={saving}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Also mark {group.letters.length} letter{group.letters.length !== 1 ? 's' : ''} as picked up
                  </span>
                </div>
              </label>
            )}
          </div>
        )}

        {/* Waive Reason Input (conditional) */}
        {showWaiveInput && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for waiving: <span className="text-red-500">*</span>
            </label>
            <textarea
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              placeholder="e.g., Goodwill gesture, Customer complaint, First-time courtesy..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={2}
              maxLength={500}
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              {waiveReason.length}/500 characters (minimum 5)
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t pt-4 space-y-2">
          {!showWaiveInput ? (
            <>
              {/* Primary: Collect Fee */}
              <button
                onClick={handleCollect}
                disabled={saving || pendingPackages.length === 0}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Banknote className="w-5 h-5" />
                {saving ? 'Processing...' : `Collect $${finalAmount.toFixed(2)} (${paymentMethod})`}
              </button>

              {/* Secondary Options */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWaiveInput(true)}
                  disabled={saving || pendingPackages.length === 0}
                  className="flex-1 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Waive Fee
                </button>
                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Skip (Owes)
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Waive confirmation */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWaiveInput(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleWaive}
                  disabled={!waiveReason.trim() || waiveReason.trim().length < 5 || saving}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Waiving...' : `Waive $${group.totalFees.toFixed(2)}`}
                </button>
              </div>
            </>
          )}

          {/* Cancel */}
          <button
            onClick={handleClose}
            disabled={saving}
            className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        {/* Info about skipping */}
        {!showWaiveInput && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              💡 <strong>Skip (Owes)</strong>: Package will be released but fee remains unpaid.
              This will be tracked as outstanding debt on the customer's account.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

