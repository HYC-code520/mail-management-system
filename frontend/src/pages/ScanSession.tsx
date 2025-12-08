import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, XCircle, Loader, Trash2, Edit, Send, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { api } from '../lib/api-client';
import { initOCRWorker, extractRecipientName, terminateOCRWorker } from '../utils/ocr';
import { smartMatchWithGemini } from '../utils/smartMatch';
import { matchContactByName } from '../utils/nameMatching';
import type { 
  ScannedItem, 
  ScanSession, 
  Contact, 
  GroupedScanResult,
  BulkSubmitItem 
} from '../types/scan';

const SESSION_TIMEOUT_HOURS = 4;
const CONFIDENCE_THRESHOLD = 0.7;

export default function ScanSessionPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session state
  const [session, setSession] = useState<ScanSession | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirm modal state
  const [pendingItem, setPendingItem] = useState<ScannedItem | null>(null);
  const [editingItem, setEditingItem] = useState<ScannedItem | null>(null);

  // Load contacts and check for existing session on mount
  useEffect(() => {
    loadContacts();
    loadExistingSession();
    initOCRWorker().catch(console.error);

    return () => {
      terminateOCRWorker();
    };
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session) {
      localStorage.setItem('scanSession', JSON.stringify(session));
    }
  }, [session]);

  const loadContacts = async () => {
    try {
      const data = await api.contacts.getAll();
      // Filter active contacts only
      const activeContacts = data.filter((c: Contact) => c.status !== 'No');
      setContacts(activeContacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Failed to load contacts');
    }
  };

  const loadExistingSession = () => {
    const savedSession = localStorage.getItem('scanSession');
    if (savedSession) {
      try {
        const parsed: ScanSession = JSON.parse(savedSession);
        const expiresAt = new Date(parsed.expiresAt);
        const now = new Date();

        if (now < expiresAt) {
          // Session still valid
          toast.success('Resumed previous scan session');
          setSession(parsed);
        } else {
          // Session expired
          localStorage.removeItem('scanSession');
          toast.error('Previous session expired (4 hours)');
        }
      } catch (error) {
        console.error('Failed to parse saved session:', error);
        localStorage.removeItem('scanSession');
      }
    }
  };

  const startSession = () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_HOURS * 60 * 60 * 1000);

    const newSession: ScanSession = {
      sessionId: `scan-${now.getTime()}`,
      items: [],
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    setSession(newSession);
    toast.success('Scan session started!');
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processPhoto(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const processPhoto = async (photoBlob: Blob) => {
    setIsProcessing(true);

    try {
      // STRATEGY: Use Smart AI Matching with Gemini first (does BOTH extraction + matching!)
      // If it fails, fall back to Tesseract + fuzzy matching
      
      console.log('🤖 Step 1: Trying smart AI matching with Gemini...');
      toast.loading('AI is analyzing the mail...', { id: 'processing', duration: 3000 });
      
      const smartResult = await smartMatchWithGemini(photoBlob, contacts);

      let finalText = smartResult.extractedText;
      let finalContact = smartResult.matchedContact;
      let finalConfidence = smartResult.confidence;
      let matchReason = smartResult.reason;

      // If Gemini smart matching failed or returned low confidence, try fallback
      if (!smartResult.matchedContact || smartResult.confidence < CONFIDENCE_THRESHOLD) {
        console.log(`⚠️ Gemini confidence low or no match (${(smartResult.confidence * 100).toFixed(0)}%), trying fallback...`);
        toast.loading('Trying alternative matching...', { id: 'processing', duration: 2000 });

        // Fallback: Tesseract OCR + Fuzzy Matching
        const tesseractResult = await extractRecipientName(photoBlob);
        const fuzzyMatch = matchContactByName(tesseractResult.text, contacts);

        if (fuzzyMatch && fuzzyMatch.confidence > finalConfidence) {
          finalText = tesseractResult.text;
          finalContact = fuzzyMatch.contact;
          finalConfidence = fuzzyMatch.confidence;
          matchReason = `Fallback fuzzy match on ${fuzzyMatch.matchedField}`;
          console.log('✅ Fallback found better match!');
        }
      }

      toast.dismiss('processing');

      if (!finalText || finalText.length < 2) {
        throw new Error('No text extracted from photo');
      }

      // Create scanned item
      const item: ScannedItem = {
        id: `item-${Date.now()}`,
        photoBlob,
        photoPreviewUrl: URL.createObjectURL(photoBlob),
        extractedText: finalText,
        matchedContact: finalContact,
        confidence: finalConfidence,
        itemType: 'Letter', // Default
        status: finalContact 
          ? (finalConfidence >= CONFIDENCE_THRESHOLD ? 'matched' : 'uncertain')
          : 'failed',
        scannedAt: new Date().toISOString(),
      };

      console.log(`✅ Match complete: confidence ${(item.confidence * 100).toFixed(0)}%`, matchReason);

      // Show confirmation modal
      setPendingItem(item);
    } catch (error) {
      console.error('Photo processing failed:', error);
      toast.error('Failed to process photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmScan = (item: ScannedItem) => {
    if (!session) return;

    setSession({
      ...session,
      items: [...session.items, item],
    });

    setPendingItem(null);
    toast.success(`Added ${item.matchedContact?.contact_person || item.matchedContact?.company_name || 'item'}`);
    
    // Vibration feedback
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const cancelScan = () => {
    if (pendingItem?.photoPreviewUrl) {
      URL.revokeObjectURL(pendingItem.photoPreviewUrl);
    }
    setPendingItem(null);
  };

  const removeItem = (itemId: string) => {
    if (!session) return;

    const item = session.items.find(i => i.id === itemId);
    if (item?.photoPreviewUrl) {
      URL.revokeObjectURL(item.photoPreviewUrl);
    }

    setSession({
      ...session,
      items: session.items.filter(i => i.id !== itemId),
    });

    toast.success('Item removed');
  };

  const openEditModal = (item: ScannedItem) => {
    setEditingItem(item);
  };

  const saveEdit = (updatedItem: ScannedItem) => {
    if (!session) return;

    setSession({
      ...session,
      items: session.items.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ),
    });

    setEditingItem(null);
    toast.success('Item updated');
  };

  const endSession = () => {
    if (!session || session.items.length === 0) {
      toast.error('No items to review');
      return;
    }

    setShowReview(true);
  };

  const groupItemsByContact = (): GroupedScanResult[] => {
    if (!session) return [];

    const grouped = new Map<string, GroupedScanResult>();

    session.items.forEach(item => {
      if (!item.matchedContact) return;

      const contactId = item.matchedContact.contact_id;

      if (!grouped.has(contactId)) {
        grouped.set(contactId, {
          contact: item.matchedContact,
          items: [],
          letterCount: 0,
          packageCount: 0,
          totalCount: 0,
        });
      }

      const group = grouped.get(contactId)!;
      group.items.push(item);
      group.totalCount++;

      if (item.itemType === 'Letter') {
        group.letterCount++;
      } else {
        group.packageCount++;
      }
    });

    return Array.from(grouped.values());
  };

  const handleBulkSubmit = async () => {
    if (!session) return;

    setIsSubmitting(true);

    try {
      // Prepare bulk submission data
      const items: BulkSubmitItem[] = session.items
        .filter(item => item.matchedContact)
        .map(item => ({
          contact_id: item.matchedContact!.contact_id,
          item_type: item.itemType,
          scanned_at: item.scannedAt,
        }));

      // Submit to backend
      const response = await api.scan.bulkSubmit(items);

      // Success!
      toast.success(`${response.itemsCreated} items logged, ${response.notificationsSent} customers notified!`);

      // Confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Clean up
      session.items.forEach(item => {
        if (item.photoPreviewUrl) {
          URL.revokeObjectURL(item.photoPreviewUrl);
        }
      });
      localStorage.removeItem('scanSession');

      // Navigate back after delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Bulk submit failed:', error);
      toast.error('Failed to submit items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render: Start Screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-200">
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-6">
                <Camera className="w-12 h-12 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Mail Scan Session
              </h1>
              <p className="text-gray-600">
                Scan multiple mail items with your camera. 
                AI will recognize recipients automatically.
              </p>
            </div>

            <button
              onClick={startSession}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-colors"
            >
              Start New Session
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 w-full py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Review Screen
  if (showReview) {
    const grouped = groupItemsByContact();
    const unmatchedItems = session.items.filter(item => !item.matchedContact);

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Review Session
                </h2>
                <button
                  onClick={() => setShowReview(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600">
                {session.items.length} items scanned • {grouped.length} customers
              </p>
            </div>

            <div className="p-6 space-y-4">
              {grouped.map(group => (
                <div key={group.contact.contact_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {group.contact.contact_person || group.contact.company_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Mailbox: {group.contact.mailbox_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {group.totalCount}
                      </div>
                      <div className="text-sm text-gray-600">
                        {group.letterCount > 0 && `${group.letterCount} Letter${group.letterCount > 1 ? 's' : ''}`}
                        {group.letterCount > 0 && group.packageCount > 0 && ', '}
                        {group.packageCount > 0 && `${group.packageCount} Package${group.packageCount > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                    <CheckCircle className="w-4 h-4" />
                    Will send notification email
                  </div>
                </div>
              ))}

              {unmatchedItems.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">
                    ⚠️ Manual Review Needed ({unmatchedItems.length})
                  </h3>
                  <p className="text-sm text-yellow-800">
                    These items couldn't be matched automatically. Please log them manually.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleBulkSubmit}
                disabled={isSubmitting || grouped.length === 0}
                className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-lg font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit All & Send Notifications
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render: Active Scan Session
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Scan Session
              </h2>
              <p className="text-sm text-gray-600">
                {session.items.length} items scanned
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('End this scan session?')) {
                  if (session.items.length === 0) {
                    setSession(null);
                    localStorage.removeItem('scanSession');
                  } else {
                    endSession();
                  }
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* Camera Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 z-20">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleCameraClick}
            disabled={isProcessing}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-lg font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Camera className="w-6 h-6" />
                Scan Next Item
              </>
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="capture-photo"
        />
      </div>

      {/* Scanned Items List */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {session.items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No items scanned yet</p>
            <p className="text-sm">Tap "Scan Next Item" to begin</p>
          </div>
        ) : (
          <div className="space-y-3">
            {session.items.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-lg p-4 border border-gray-200 flex items-center gap-4"
              >
                {item.photoPreviewUrl && (
                  <img
                    src={item.photoPreviewUrl}
                    alt="Scanned mail"
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.status === 'matched' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-gray-900 truncate">
                      {item.matchedContact?.contact_person || item.matchedContact?.company_name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      item.itemType === 'Package' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.itemType}
                    </span>
                    <span className="text-xs">
                      {Math.round(item.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {pendingItem && (
        <ConfirmModal
          item={pendingItem}
          contacts={contacts}
          onConfirm={confirmScan}
          onCancel={cancelScan}
        />
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditModal
          item={editingItem}
          contacts={contacts}
          onSave={saveEdit}
          onCancel={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

// Confirm Modal Component
interface ConfirmModalProps {
  item: ScannedItem;
  contacts: Contact[];
  onConfirm: (item: ScannedItem) => void;
  onCancel: () => void;
}

function ConfirmModal({ item, contacts, onConfirm, onCancel }: ConfirmModalProps) {
  const [editedItem, setEditedItem] = useState(item);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Confirm Scan
        </h3>

        {item.photoPreviewUrl && (
          <img
            src={item.photoPreviewUrl}
            alt="Scanned mail"
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer
            </label>
            <select
              value={editedItem.matchedContact?.contact_id || ''}
              onChange={(e) => {
                const contact = contacts.find(c => c.contact_id === e.target.value);
                setEditedItem({ ...editedItem, matchedContact: contact || null });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select customer...</option>
              {contacts.map(contact => (
                <option key={contact.contact_id} value={contact.contact_id}>
                  {contact.contact_person || contact.company_name} - {contact.mailbox_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setEditedItem({ ...editedItem, itemType: 'Letter' })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  editedItem.itemType === 'Letter'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                📧 Letter
              </button>
              <button
                onClick={() => setEditedItem({ ...editedItem, itemType: 'Package' })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  editedItem.itemType === 'Package'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                📦 Package
              </button>
            </div>
          </div>

          {item.status !== 'matched' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Low confidence match. Please verify customer is correct.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(editedItem)}
            disabled={!editedItem.matchedContact}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Modal Component
interface EditModalProps {
  item: ScannedItem;
  contacts: Contact[];
  onSave: (item: ScannedItem) => void;
  onCancel: () => void;
}

function EditModal({ item, contacts, onSave, onCancel }: EditModalProps) {
  const [editedItem, setEditedItem] = useState(item);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Edit Item
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer
            </label>
            <select
              value={editedItem.matchedContact?.contact_id || ''}
              onChange={(e) => {
                const contact = contacts.find(c => c.contact_id === e.target.value);
                setEditedItem({ ...editedItem, matchedContact: contact || null });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select customer...</option>
              {contacts.map(contact => (
                <option key={contact.contact_id} value={contact.contact_id}>
                  {contact.contact_person || contact.company_name} - {contact.mailbox_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setEditedItem({ ...editedItem, itemType: 'Letter' })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  editedItem.itemType === 'Letter'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                📧 Letter
              </button>
              <button
                onClick={() => setEditedItem({ ...editedItem, itemType: 'Package' })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  editedItem.itemType === 'Package'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                📦 Package
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(editedItem)}
            disabled={!editedItem.matchedContact}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

