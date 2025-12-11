import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, XCircle, Loader, Trash2, Edit, Send, ArrowLeft, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { api } from '../lib/api-client';
import { initOCRWorker, terminateOCRWorker } from '../utils/ocr';
import { smartMatchWithGemini } from '../utils/smartMatch';
import CameraModal from '../components/scan/CameraModal';
import type { 
  ScannedItem, 
  ScanSession, 
  Contact, 
  GroupedScanResult,
  BulkSubmitItem 
} from '../types/scan';

const SESSION_TIMEOUT_HOURS = 4;
const CONFIDENCE_THRESHOLD = 0.5; // Lowered from 0.7 to 0.5 to accept more matches

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
  const [quickScanMode, setQuickScanMode] = useState(true); // Default to true - most users want bulk scanning
  const [processingQueue, setProcessingQueue] = useState(0); // Count of items being processed in background
  const lastGeminiCallRef = useRef<number>(0); // Track last Gemini API call for rate limiting
  
  // Confirm modal state
  const [pendingItem, setPendingItem] = useState<ScannedItem | null>(null);
  const [editingItem, setEditingItem] = useState<ScannedItem | null>(null);
  
  // Photo preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  
  // Camera modal state
  const [showCameraModal, setShowCameraModal] = useState(false);

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
  
  const handleWebcamClick = () => {
    setShowCameraModal(true);
  };
  
  const handleCameraCapture = (photoBlob: Blob) => {
    if (quickScanMode) {
      processPhotoBackground(photoBlob);
    } else {
      processPhoto(photoBlob);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.warn('⚠️ No file selected');
      return;
    }

    console.log(`📸 File selected: ${file.name}, size: ${(file.size / 1024).toFixed(2)} KB`);

    // In Quick Scan Mode: Process in background, allow next photo immediately!
    if (quickScanMode) {
      console.log('⚡ Quick Scan Mode: Processing in background...');
      
      // Increment queue counter BEFORE processing
      setProcessingQueue(prev => {
        const newCount = prev + 1;
        console.log(`📊 Queue count: ${newCount}`);
        return newCount;
      });
      
      // Process photo in background (non-blocking!)
      processPhotoBackground(file).catch(err => {
        console.error('❌ Background processing error:', err);
      });
      
      // Reset input so same file can be selected again
      event.target.value = '';
      
      // DON'T auto-trigger - let user control when to take next photo
      // This prevents infinite loops and gives user time to position next mail
      
      return;
    }

    // Normal mode: Process and wait
    await processPhoto(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const processPhotoBackground = async (photoBlob: Blob) => {
    const processingId = `photo-${Date.now()}`;
    console.log(`🔄 [${processingId}] Background processing started`);
    
    // RATE LIMITING: Gemini has 15 RPM limit, so wait at least 4 seconds between calls
    const MIN_DELAY_MS = 4000; // 4 seconds = 15 calls per minute
    const now = Date.now();
    const timeSinceLastCall = now - lastGeminiCallRef.current;
    
    // Reserve our spot IMMEDIATELY to prevent race conditions
    const ourCallTime = lastGeminiCallRef.current + MIN_DELAY_MS;
    lastGeminiCallRef.current = Math.max(now, ourCallTime);
    
    if (timeSinceLastCall < MIN_DELAY_MS) {
      const waitTime = MIN_DELAY_MS - timeSinceLastCall;
      console.log(`⏳ [${processingId}] Rate limiting: waiting ${Math.round(waitTime / 1000)}s before API call`);
      toast(`⏳ Processing (${Math.round(waitTime / 1000)}s delay to avoid rate limits)...`, {
        duration: waitTime,
        icon: '⏱️',
      });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } else {
      console.log(`✅ [${processingId}] No rate limiting needed (${Math.round(timeSinceLastCall / 1000)}s since last call)`);
    }
    
    try {
      // Process photo without blocking UI
      const result = await processPhotoInternal(photoBlob);
      
      console.log(`✅ [${processingId}] Background processing complete:`, {
        hasResult: !!result,
        confidence: result?.confidence,
        contact: result?.matchedContact?.contact_person || result?.matchedContact?.company_name,
        hasSession: !!session,
      });
      
      // If high confidence, auto-add to session
      if (result && result.confidence >= 0.7 && result.matchedContact) {
        console.log(`🚀 [${processingId}] Auto-accepting high confidence match`);
        confirmScan(result);
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
      } else if (result) {
        // Low confidence: Show modal
        console.log(`⚠️ [${processingId}] Low confidence (${(result.confidence * 100).toFixed(0)}%), showing modal`);
        setPendingItem(result);
      } else {
        console.warn(`⚠️ [${processingId}] No result from processing`);
      }
    } catch (error) {
      console.error(`❌ [${processingId}] Background processing failed:`, error);
      toast.error('Failed to process one photo. Continue scanning!', { duration: 2000 });
    } finally {
      // Decrement queue counter
      setProcessingQueue(prev => {
        const newCount = Math.max(0, prev - 1);
        console.log(`📊 [${processingId}] Queue decremented to: ${newCount}`);
        return newCount;
      });
    }
  };

  const processPhoto = async (photoBlob: Blob) => {
    setIsProcessing(true);
    try {
      const result = await processPhotoInternal(photoBlob);
      if (result) {
        setPendingItem(result);
      }
    } catch (error) {
      console.error('❌ Photo processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to process photo: ${errorMessage}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processPhotoInternal = async (photoBlob: Blob): Promise<ScannedItem | null> => {
    // DEBUG: Log photo details
    console.log('📷 Photo received:', {
      size: (photoBlob.size / 1024).toFixed(2) + ' KB',
      type: photoBlob.type,
    });
    
    // DEBUG: Create preview URL so we can see what we're processing
    const previewUrl = URL.createObjectURL(photoBlob);
    console.log('👁️ Preview image:', previewUrl);
    console.log('💡 TIP: Copy the URL above and paste in browser to see the photo being processed');

    // Use Gemini smart matching (now with 1,500 requests/day!)
    console.log('🤖 Using Gemini AI for smart matching...');
    
    const smartResult = await smartMatchWithGemini(photoBlob, contacts);
    console.log('🎯 Gemini smart match result:', smartResult);

    const finalText = smartResult.extractedText || '';
    const finalContact = smartResult.matchedContact || null;
    const finalConfidence = smartResult.confidence || 0;
    const matchReason = smartResult.matchedContact 
      ? `Gemini AI matched: ${smartResult.matchedContact.contact_person || smartResult.matchedContact.company_name}`
      : 'No match found';

    toast.dismiss('processing');

    if (!finalText || finalText.length < 2) {
      if (!quickScanMode) {
        toast.error('Could not read any text from photo. Please try again with better lighting.');
      }
      return null; // Return null instead of throwing
    }

    // Create scanned item
    const item: ScannedItem = {
      id: `item-${Date.now()}-${Math.random()}`, // Add random to prevent collisions
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

    return item;
  };

  const confirmScan = (item: ScannedItem) => {
    console.log('➕ confirmScan called:', {
      itemId: item.id,
      contact: item.matchedContact?.contact_person || item.matchedContact?.company_name,
      hasSession: !!session,
      sessionId: session?.sessionId,
      currentItemCount: session?.items.length,
    });

    if (!session) {
      console.error('❌ Cannot confirm scan: No active session!', {
        sessionState: session,
        localStorage: localStorage.getItem('scanSession'),
      });
      toast.error('No active session. Please start a new session.');
      return;
    }

    console.log('➕ Adding item to session:', {
      itemId: item.id,
      contact: item.matchedContact?.contact_person || item.matchedContact?.company_name,
      currentCount: session.items.length,
    });

    // Use functional update to ensure we have latest session state!
    setSession(prevSession => {
      if (!prevSession) {
        console.error('❌ prevSession is null in setState!');
        return prevSession;
      }
      
      const newSession = {
        ...prevSession,
        items: [...prevSession.items, item],
      };
      
      console.log('✅ Session updated! Old count:', prevSession.items.length, 'New count:', newSession.items.length);
      return newSession;
    });

    setPendingItem(null);
    
    // In Quick Scan Mode, use shorter toast duration
    const toastDuration = quickScanMode ? 1000 : 2000;
    toast.success(
      `✓ ${item.matchedContact?.contact_person || item.matchedContact?.company_name || 'Item'}`,
      { duration: toastDuration }
    );
    
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
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold shadow-md"
            >
              End Session
            </button>
          </div>
          
          {/* Quick Scan Mode Toggle */}
          <div className="mt-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <input
              type="checkbox"
              id="quickScanMode"
              checked={quickScanMode}
              onChange={(e) => setQuickScanMode(e.target.checked)}
              className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
            />
            <label htmlFor="quickScanMode" className="flex-1 cursor-pointer">
              <span className="font-semibold text-green-900">⚡ Quick Scan Mode (Recommended)</span>
              <p className="text-xs text-green-700 mt-0.5">
                Auto-accept high confidence matches (≥70%) for faster bulk scanning. Uncheck if you want to review each scan manually.
              </p>
            </label>
          </div>
          
          {/* Debug Panel - Shows processing status */}
          {quickScanMode && (
            <div className="mt-3 bg-gray-100 border border-gray-300 rounded-lg p-3">
              <p className="text-xs font-mono text-gray-700">
                🟢 Scanned: {session.items.length} | 🔵 Processing: {processingQueue} | 
                📊 Total contacts: {contacts.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Camera Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 z-20">
        <div className="max-w-4xl mx-auto">
          {/* Floating Counter Badge (visible in Quick Scan Mode) */}
          {quickScanMode && (session.items.length > 0 || processingQueue > 0) && (
            <div className="mb-3 flex items-center justify-center gap-3">
              <div className="bg-green-600 text-white px-6 py-2 rounded-full shadow-lg">
                <span className="text-2xl font-bold">{session.items.length}</span>
                <span className="text-sm ml-2">scanned</span>
              </div>
              {processingQueue > 0 && (
                <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
                  <Loader className="w-4 h-4 inline mr-2" />
                  <span className="text-sm">{processingQueue} processing...</span>
                </div>
              )}
            </div>
          )}
          
          {/* Camera Options */}
          <div className="grid grid-cols-2 gap-3">
            {/* Webcam Button (Desktop/Laptop) */}
            <button
              onClick={handleWebcamClick}
              disabled={isProcessing && !quickScanMode}
              className="py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              title="Use computer webcam"
            >
              <Video className="w-5 h-5" />
              <span className="hidden sm:inline">Webcam</span>
              <span className="sm:hidden">📹</span>
            </button>
            
            {/* File/Mobile Camera Button */}
            <button
              onClick={handleCameraClick}
              disabled={isProcessing && !quickScanMode}
              className="py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-base font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              title="Upload image or use phone camera"
            >
              {isProcessing && !quickScanMode ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">Processing...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span className="hidden sm:inline">
                    {quickScanMode ? 'Upload/Camera' : 'Upload'}
                  </span>
                  <span className="sm:hidden">📸</span>
                </>
              )}
            </button>
          </div>
          
          {quickScanMode && processingQueue === 0 && session.items.length > 0 && (
            <p className="text-center text-sm text-gray-600 mt-2">
              ✅ All photos processed! Keep scanning or end session.
            </p>
          )}
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
                    className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setPreviewPhoto(item.photoPreviewUrl!)}
                    title="Click to view full size"
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
          onPhotoClick={setPreviewPhoto}
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

      {/* Photo Preview Modal - Full Screen */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
              title="Close"
            >
              <XCircle className="w-6 h-6 text-gray-700" />
            </button>
            <img
              src={previewPhoto}
              alt="Full size preview"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-4 text-sm">
              Click outside or press X to close
            </p>
          </div>
        </div>
      )}
      
      {/* Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}

// Confirm Modal Component
interface ConfirmModalProps {
  item: ScannedItem;
  contacts: Contact[];
  onConfirm: (item: ScannedItem) => void;
  onCancel: () => void;
  onPhotoClick: (photoUrl: string) => void;
}

function ConfirmModal({ item, contacts, onConfirm, onCancel, onPhotoClick }: ConfirmModalProps) {
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
            className="w-full h-48 object-cover rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onPhotoClick(item.photoPreviewUrl!)}
            title="Click to view full size"
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

