import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import GroupedFollowUpSection from '../components/dashboard/GroupedFollowUp.tsx';
import SendEmailModal from '../components/SendEmailModal.tsx';
import WaiveFeeModal from '../components/WaiveFeeModal.tsx';
import CollectFeeModal from '../components/CollectFeeModal.tsx';
import { getTodayNY, toNYDateString } from '../utils/timezone.ts';

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

export default function FollowUpsPage() {
  const navigate = useNavigate();
  const [followUps, setFollowUps] = useState<GroupedFollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  // Send Email Modal states
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [emailingMailItem, setEmailingMailItem] = useState<MailItem | null>(null);
  const [emailingBulkItems, setEmailingBulkItems] = useState<MailItem[]>([]);
  const [suggestedTemplateType, setSuggestedTemplateType] = useState<string | undefined>(undefined);
  const [emailingGroupKey, setEmailingGroupKey] = useState<string | null>(null);

  // Waive Fee Modal states
  const [isWaiveFeeModalOpen, setIsWaiveFeeModalOpen] = useState(false);
  const [waivingGroup, setWaivingGroup] = useState<GroupedFollowUp | null>(null);

  // Collect Fee Modal states
  const [isCollectFeeModalOpen, setIsCollectFeeModalOpen] = useState(false);
  const [collectingGroup, setCollectingGroup] = useState<GroupedFollowUp | null>(null);

  const loadFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      const statsData = await api.stats.getDashboardStats(7);
      setFollowUps(statsData.needsFollowUp || []);
    } catch (err) {
      console.error('Error loading follow-ups:', err);
      toast.error('Failed to load follow-ups data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFollowUps();
  }, [loadFollowUps]);

  const getDaysSince = (dateStr: string) => {
    const todayNY = getTodayNY();
    const todayDate = new Date(todayNY + 'T00:00:00');
    const itemDateNY = toNYDateString(dateStr);
    const itemDate = new Date(itemDateNY + 'T00:00:00');
    const diffTime = todayDate.getTime() - itemDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const openSendEmailForGroup = (group: GroupedFollowUp) => {
    const allItems = [...group.packages, ...group.letters];
    const firstItem = allItems[0];
    
    if (firstItem && allItems.length > 0) {
      const oldestDays = Math.max(...allItems.map(item => getDaysSince(item.received_date)));
      
      let suggested: string | undefined;
      if (allItems.length > 1) {
        suggested = 'Summary Notification (All Items)';
      } else if (oldestDays >= 28) {
        suggested = 'Final Notice Before Abandonment';
      } else if (group.totalFees > 0) {
        suggested = 'Package Fee Reminder';
      } else {
        suggested = 'General Reminder';
      }
      
      setSuggestedTemplateType(suggested);
      setEmailingBulkItems(allItems);
      
      const groupKey = `${firstItem.contact_id}|${firstItem.received_date.split('T')[0]}|${firstItem.item_type}`;
      setEmailingGroupKey(groupKey);
      
      setEmailingMailItem(firstItem);
      setIsSendEmailModalOpen(true);
    }
  };

  const handleEmailSuccess = async () => {
    const isBulk = emailingBulkItems.length > 0;
    await new Promise(resolve => setTimeout(resolve, isBulk ? 800 : 200));
    
    loadFollowUps();
    
    if (emailingMailItem) {
      const customerName = emailingMailItem.contacts?.contact_person || 
                          emailingMailItem.contacts?.company_name || 
                          'Customer';
      
      if (isBulk) {
        const groupKeys = emailingBulkItems.map(item => 
          `${item.contact_id}|${item.received_date.split('T')[0]}|${item.item_type}`
        );
        const uniqueGroupKeys = [...new Set(groupKeys)];
        
        toast.success(
          (t) => (
            <div className="flex items-center justify-between gap-4">
              <span>📧 Summary email sent to {customerName} ({emailingBulkItems.length} items)</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/dashboard/mail', { 
                    state: { 
                      jumpToGroupKeys: uniqueGroupKeys,
                      sortByLastNotified: true
                    } 
                  });
                }}
                className="text-blue-600 hover:underline text-sm font-medium whitespace-nowrap"
              >
                View in Log →
              </button>
            </div>
          ),
          { duration: 15000 }
        );
      } else {
        const groupKey = emailingGroupKey || 
          `${emailingMailItem.contact_id}|${emailingMailItem.received_date.split('T')[0]}|${emailingMailItem.item_type}`;
        
        toast.success(
          (t) => (
            <div className="flex items-center justify-between gap-4">
              <span>✅ Email sent to {customerName}</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate('/dashboard/mail', { 
                    state: { 
                      jumpToGroupKey: groupKey,
                      sortByLastNotified: true
                    } 
                  });
                }}
                className="text-blue-600 hover:underline text-sm"
              >
                View in Log →
              </button>
            </div>
          ),
          { duration: 15000 }
        );
      }
    }
    
    setIsSendEmailModalOpen(false);
    setEmailingMailItem(null);
    setEmailingBulkItems([]);
    setEmailingGroupKey(null);
  };

  const openWaiveFeeModal = (group: GroupedFollowUp) => {
    setWaivingGroup(group);
    setIsWaiveFeeModalOpen(true);
  };

  const handleWaiveFeeSuccess = () => {
    loadFollowUps();
    setIsWaiveFeeModalOpen(false);
    setWaivingGroup(null);
    
    if (waivingGroup) {
      const customerName = waivingGroup.contact.contact_person || 
                          waivingGroup.contact.company_name || 
                          'Customer';
      toast.success(`✅ Fee waived for ${customerName}`);
    }
  };

  const openCollectFeeModal = (group: GroupedFollowUp) => {
    setCollectingGroup(group);
    setIsCollectFeeModalOpen(true);
  };

  const handleCollectFeeSuccess = async (action: 'collected' | 'waived' | 'skipped') => {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    loadFollowUps();
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

  const handleMarkAbandoned = async (group: GroupedFollowUp) => {
    const allItems = [...group.packages, ...group.letters];
    const abandonedItems = allItems.filter(item => getDaysSince(item.received_date) >= 30);
    
    if (abandonedItems.length === 0) {
      toast.error('No items are 30+ days old in this group');
      return;
    }
    
    const customerName = group.contact.contact_person || group.contact.company_name || 'Unknown';
    const confirmMessage = abandonedItems.length === 1
      ? `Mark 1 item (30+ days old) for ${customerName} as abandoned?`
      : `Mark ${abandonedItems.length} items (30+ days old) for ${customerName} as abandoned?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      for (const item of abandonedItems) {
        await api.mailItems.updateStatus(item.mail_item_id, 'Abandoned Package');
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      loadFollowUps();
      
      toast.success(
        `📦 Marked ${abandonedItems.length} item${abandonedItems.length > 1 ? 's' : ''} as abandoned for ${customerName}`
      );
    } catch (err) {
      console.error('Error marking items as abandoned:', err);
      toast.error('Failed to mark items as abandoned');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-10 bg-gradient-to-b from-orange-500 to-red-600 rounded-full"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Needs Follow-up
          </h1>
        </div>
        <p className="text-gray-600 ml-5">Customers requiring attention for fees, notifications, or pickups</p>
      </div>

      {/* Follow-up List */}
      <GroupedFollowUpSection
        groups={followUps}
        onWaiveFee={openWaiveFeeModal}
        onSendEmail={openSendEmailForGroup}
        onMarkAbandoned={handleMarkAbandoned}
        onCollectFee={openCollectFeeModal}
        getDaysSince={getDaysSince}
        loading={loading}
      />

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
      
      {/* Send Email Modal */}
      {emailingMailItem && (
        <SendEmailModal
          isOpen={isSendEmailModalOpen}
          onClose={() => {
            setIsSendEmailModalOpen(false);
            setEmailingMailItem(null);
            setEmailingBulkItems([]);
            setSuggestedTemplateType(undefined);
          }}
          mailItem={emailingMailItem}
          bulkMailItems={emailingBulkItems}
          onSuccess={handleEmailSuccess}
          suggestedTemplateType={suggestedTemplateType}
        />
      )}
    </div>
  );
}
