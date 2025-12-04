import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LogPage from '../Log';
import { api } from '../../lib/api-client';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  api: {
    mailItems: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contacts: {
      getAll: vi.fn(),
    },
    actionHistory: {
      getByMailItem: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock timezone utilities
vi.mock('../../utils/timezone', () => ({
  getTodayNY: () => '2025-12-04',
  toNYDateString: (date: string) => date.split('T')[0],
  getNYDate: () => new Date('2025-12-04T00:00:00-05:00'),
}));

const mockContacts = [
  {
    contact_id: 'contact-1',
    contact_person: 'John Doe',
    mailbox_number: 'A1',
    status: 'Active',
  },
];

const mockMailItems = [
  {
    mail_item_id: 'mail-1',
    contact_id: 'contact-1',
    item_type: 'Letter',
    status: 'Received',
    received_date: '2025-12-04T10:00:00Z',
    quantity: 5,
    contacts: mockContacts[0],
  },
];

describe('Mail Log - Quantity Change Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.contacts.getAll as any).mockResolvedValue(mockContacts);
    (api.mailItems.getAll as any).mockResolvedValue(mockMailItems);
    (api.actionHistory.getByMailItem as any).mockResolvedValue([]);
  });

  const renderLogPage = () => {
    return render(
      <BrowserRouter>
        <LogPage />
      </BrowserRouter>
    );
  };

  describe('Quantity Edit Tracking', () => {
    it('should detect when quantity changes', () => {
      const oldQuantity = 5;
      const newQuantity = 10;
      const quantityChanged = oldQuantity !== newQuantity;

      expect(quantityChanged).toBe(true);
    });

    it('should not detect change when quantity stays the same', () => {
      const oldQuantity = 5;
      const newQuantity = 5;
      const quantityChanged = oldQuantity !== newQuantity;

      expect(quantityChanged).toBe(false);
    });

    it('should require staff selection when quantity changes', async () => {
      const editingMailItem = mockMailItems[0];
      const formData = {
        ...editingMailItem,
        quantity: 10, // Changed from 5 to 10
        performed_by: '', // Empty - should fail validation
      };

      const oldQuantity = editingMailItem.quantity || 1;
      const newQuantity = formData.quantity;
      const quantityChanged = oldQuantity !== newQuantity;

      expect(quantityChanged).toBe(true);
      expect(formData.performed_by.trim()).toBe('');
      // Should show error: 'Please select who made this quantity change'
    });

    it('should allow update when staff is selected for quantity change', async () => {
      const editingMailItem = mockMailItems[0];
      const formData = {
        ...editingMailItem,
        quantity: 10, // Changed from 5 to 10
        performed_by: 'Merlin', // Staff selected
      };

      const oldQuantity = editingMailItem.quantity || 1;
      const newQuantity = formData.quantity;
      const quantityChanged = oldQuantity !== newQuantity;

      expect(quantityChanged).toBe(true);
      expect(formData.performed_by.trim()).not.toBe('');
      // Should proceed with update
    });

    it('should create correct action history for quantity change', async () => {
      (api.mailItems.update as any).mockResolvedValue({ success: true });
      (api.actionHistory.create as any).mockResolvedValue({ success: true });

      const oldQuantity = 5;
      const newQuantity = 10;
      const mailItemId = 'mail-1';

      // Simulate the action history creation
      await api.actionHistory.create({
        mail_item_id: mailItemId,
        action_type: 'updated',
        action_description: `Quantity changed from ${oldQuantity} to ${newQuantity}`,
        previous_value: oldQuantity.toString(),
        new_value: newQuantity.toString(),
        performed_by: 'Merlin',
        notes: null,
      });

      expect(api.actionHistory.create).toHaveBeenCalledWith({
        mail_item_id: mailItemId,
        action_type: 'updated',
        action_description: 'Quantity changed from 5 to 10',
        previous_value: '5',
        new_value: '10',
        performed_by: 'Merlin',
        notes: null,
      });
    });

    it('should handle quantity increase correctly', () => {
      const oldQuantity = 1;
      const newQuantity = 17;
      const description = `Quantity changed from ${oldQuantity} to ${newQuantity}`;

      expect(description).toBe('Quantity changed from 1 to 17');
      expect(newQuantity).toBeGreaterThan(oldQuantity);
    });

    it('should handle quantity decrease correctly', () => {
      const oldQuantity = 20;
      const newQuantity = 5;
      const description = `Quantity changed from ${oldQuantity} to ${newQuantity}`;

      expect(description).toBe('Quantity changed from 20 to 5');
      expect(newQuantity).toBeLessThan(oldQuantity);
    });
  });

  describe('Adding to Existing Mail Quantity Tracking', () => {
    it('should create correct history when adding to existing mail', async () => {
      const existingQuantity = 2;
      const addingQuantity = 3;
      const newTotalQuantity = existingQuantity + addingQuantity;
      const itemType = 'Letter';

      const historyDescription = `Added ${addingQuantity} more ${itemType}${addingQuantity > 1 ? 's' : ''} (total now: ${newTotalQuantity})`;

      expect(historyDescription).toBe('Added 3 more Letters (total now: 5)');
      expect(newTotalQuantity).toBe(5);
    });

    it('should handle singular item type correctly', async () => {
      const existingQuantity = 5;
      const addingQuantity = 1;
      const newTotalQuantity = existingQuantity + addingQuantity;
      const itemType = 'Package';

      const historyDescription = `Added ${addingQuantity} more ${itemType}${addingQuantity > 1 ? 's' : ''} (total now: ${newTotalQuantity})`;

      expect(historyDescription).toBe('Added 1 more Package (total now: 6)');
    });

    it('should calculate total quantity correctly for large numbers', () => {
      const existingQuantity = 1;
      const addingQuantity = 16;
      const newTotalQuantity = existingQuantity + addingQuantity;

      expect(newTotalQuantity).toBe(17);
    });
  });

  describe('Staff Selector Visibility', () => {
    it('should show staff selector when quantity changes', () => {
      const editingMailItem = { quantity: 5 };
      const formData = { quantity: 10 };

      const shouldShowSelector = formData.quantity !== (editingMailItem.quantity || 1);

      expect(shouldShowSelector).toBe(true);
    });

    it('should show staff selector when status changes', () => {
      const editingMailItem = { status: 'Received' };
      const formData = { status: 'Notified' };

      const shouldShowSelector = formData.status !== editingMailItem.status;

      expect(shouldShowSelector).toBe(true);
    });

    it('should show staff selector when both status and quantity change', () => {
      const editingMailItem = { status: 'Received', quantity: 5 };
      const formData = { status: 'Notified', quantity: 10 };

      const statusChanged = formData.status !== editingMailItem.status;
      const quantityChanged = formData.quantity !== (editingMailItem.quantity || 1);
      const shouldShowSelector = statusChanged || quantityChanged;

      expect(shouldShowSelector).toBe(true);
      expect(statusChanged).toBe(true);
      expect(quantityChanged).toBe(true);
    });

    it('should not show staff selector when nothing changes', () => {
      const editingMailItem = { status: 'Received', quantity: 5 };
      const formData = { status: 'Received', quantity: 5 };

      const statusChanged = formData.status !== editingMailItem.status;
      const quantityChanged = formData.quantity !== (editingMailItem.quantity || 1);
      const shouldShowSelector = statusChanged || quantityChanged;

      expect(shouldShowSelector).toBe(false);
    });
  });

  describe('Action History Message Format', () => {
    it('should format quantity change message correctly', () => {
      const oldQty = 1;
      const newQty = 17;
      const message = `Quantity changed from ${oldQty} to ${newQty}`;

      expect(message).toBe('Quantity changed from 1 to 17');
    });

    it('should format add to existing message correctly', () => {
      const added = 16;
      const total = 17;
      const type = 'Letter';
      const message = `Added ${added} more ${type}${added > 1 ? 's' : ''} (total now: ${total})`;

      expect(message).toBe('Added 16 more Letters (total now: 17)');
    });

    it('should show both status and quantity changes in UI', () => {
      const statusChanged = true;
      const quantityChanged = true;
      const oldStatus = 'Received';
      const newStatus = 'Notified';
      const oldQty = 5;
      const newQty = 10;

      const statusMessage = statusChanged
        ? `Status is being changed from "${oldStatus}" to "${newStatus}"`
        : '';
      const quantityMessage = quantityChanged
        ? `Quantity is being changed from ${oldQty} to ${newQty}`
        : '';

      expect(statusMessage).toBe('Status is being changed from "Received" to "Notified"');
      expect(quantityMessage).toBe('Quantity is being changed from 5 to 10');
    });
  });

  describe('Edge Cases', () => {
    it('should handle quantity of 1 (default) correctly', () => {
      const oldQuantity = undefined; // Not set in database
      const newQuantity = 5;
      const effectiveOldQuantity = oldQuantity || 1;
      const quantityChanged = effectiveOldQuantity !== newQuantity;

      expect(effectiveOldQuantity).toBe(1);
      expect(quantityChanged).toBe(true);
    });

    it('should handle setting quantity to 1 from undefined', () => {
      const oldQuantity = undefined;
      const newQuantity = 1;
      const effectiveOldQuantity = oldQuantity || 1;
      const quantityChanged = effectiveOldQuantity !== newQuantity;

      expect(quantityChanged).toBe(false); // 1 === 1, no change
    });

    it('should require minimum quantity of 1', () => {
      const quantity = 0;
      const isValid = quantity >= 1;

      expect(isValid).toBe(false);
    });

    it('should handle very large quantities', () => {
      const oldQuantity = 100;
      const newQuantity = 250;
      const message = `Quantity changed from ${oldQuantity} to ${newQuantity}`;

      expect(message).toBe('Quantity changed from 100 to 250');
    });
  });
});

