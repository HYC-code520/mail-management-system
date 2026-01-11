import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, XCircle, X, Loader, Trash2, Edit, Send, ArrowLeft, Video, Zap, DollarSign, Info, Users, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { api } from '../lib/api-client';
import { initOCRWorker, terminateOCRWorker, extractRecipientName } from '../utils/ocr';
import { smartMatchWithGemini } from '../utils/smartMatch';
import { matchContactByName } from '../utils/nameMatching';
import CameraModal from '../components/scan/CameraModal';
import BulkScanEmailModal from '../components/scan/BulkScanEmailModal';
import { getCustomerDisplayName } from '../utils/customerDisplay';
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
  const [scannedBy, setScannedBy] = useState<string | null>('Merlin'); // Default to Merlin for faster demos
  const [skipNotification, setSkipNotification] = useState(false); // NEW: Option to skip customer notifications
  
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

  // Email preview modal state
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Celebration control state (for demos - manual trigger)
  const [isReadyToCelebrate, setIsReadyToCelebrate] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ scannedCount: number; customersNotified: number } | null>(null);

  // Batch mode state (for cost savings - 10 images in 1 API call)
  const [batchMode, setBatchMode] = useState(true); // Default ON for demos and efficiency
  const [batchQueue, setBatchQueue] = useState<Array<{ blob: Blob; previewUrl: string }>>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const BATCH_SIZE = 10;

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
          // Session still valid - only show toast once
          const hasShownToast = sessionStorage.getItem('scanSessionResumedToast');
          if (!hasShownToast) {
            toast.success('Resumed previous scan session');
            sessionStorage.setItem('scanSessionResumedToast', 'true');
          }
          setSession(parsed);
        } else {
          // Session expired
          localStorage.removeItem('scanSession');
          toast('Previous session expired (4 hours)', {
            icon: 'ℹ️',
            duration: 4000
          });
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
    // If batch mode is ON, add to queue instead of processing
    if (batchMode) {
      addToBatchQueue(photoBlob);
      return;
    }

    // Show immediate feedback - non-blocking position at top
    toast.loading('Processing... Keep scanning!', {
      id: 'photo-processing',
      duration: 3000,
      position: 'top-center',
      icon: '🔄',
      style: {
        background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
        color: '#fff',
        fontWeight: '600',
        padding: '14px 28px',
        fontSize: '15px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)',
        marginTop: '20px'
      }
    });

    if (quickScanMode) {
      processPhotoBackground(photoBlob);
    } else {
      processPhoto(photoBlob);
    }
  };

  // Add photo to batch queue
  const addToBatchQueue = (photoBlob: Blob) => {
    // Check if batch is full before adding
    if (batchQueue.length >= BATCH_SIZE) {
      toast.error(`Batch is full (${BATCH_SIZE} photos). Process current batch first.`);
      return;
    }

    const previewUrl = URL.createObjectURL(photoBlob);
    const newCount = batchQueue.length + 1;

    setBatchQueue(prev => [...prev, { blob: photoBlob, previewUrl }]);

    // Show toast outside state setter to avoid React StrictMode duplicate
    toast.success(`Added to batch (${newCount}/${BATCH_SIZE})`, { duration: 1500 });

    // Auto-process when batch is full
    if (newCount === BATCH_SIZE) {
      toast('Batch full! Processing automatically...', { icon: '🚀', duration: 2000 });
      // Small delay to let state update, then process
      setTimeout(() => processBatchQueue(), 500);
    }
  };

  // Queue for items that need manual review from batch processing
  const [batchReviewQueue, setBatchReviewQueue] = useState<ScannedItem[]>([]);

  // Process all photos in batch queue
  const processBatchQueue = async () => {
    if (batchQueue.length === 0) {
      toast.error('No photos in batch queue');
      return;
    }

    if (!session) {
      toast.error('No active session. Please start a session first.');
      return;
    }

    setIsProcessingBatch(true);
    toast.loading(`Processing ${batchQueue.length} photos...`, { id: 'batch-processing' });

    try {
      // Convert all blobs to base64
      const images = await Promise.all(
        batchQueue.map(async (item) => {
          const base64 = await blobToBase64(item.blob);
          const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
          return {
            data: base64Data,
            mimeType: item.blob.type || 'image/jpeg',
          };
        })
      );

      // Prepare contacts for API
      const simplifiedContacts = contacts.map(c => ({
        contact_id: c.contact_id,
        contact_person: c.contact_person,
        company_name: c.company_name,
        mailbox_number: c.mailbox_number,
      }));

      console.log(`🤖 Sending ${images.length} images in batch...`);
      const startTime = Date.now();

      // Call batch API
      const response = await api.scan.smartMatchBatch({
        images,
        contacts: simplifiedContacts,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Batch processed in ${duration}ms:`, response);

      toast.dismiss('batch-processing');

      // Process each result
      let matchedCount = 0;
      const itemsToAdd: ScannedItem[] = [];
      const itemsNeedingReview: ScannedItem[] = [];

      for (let i = 0; i < response.results.length; i++) {
        const result = response.results[i];
        const queueItem = batchQueue[i];

        const item: ScannedItem = {
          id: `item-${Date.now()}-${i}`,
          photoBlob: queueItem.blob,
          photoPreviewUrl: queueItem.previewUrl,
          extractedText: result.extractedText || '',
          matchedContact: result.matchedContact || null,
          confidence: result.confidence || 0,
          itemType: 'Letter',
          status: (result.matchedContact && result.confidence >= CONFIDENCE_THRESHOLD)
            ? 'matched'
            : (result.matchedContact ? 'uncertain' : 'failed'),
          scannedAt: new Date().toISOString(),
        };

        if (result.matchedContact && result.confidence >= 0.5) {
          // High enough confidence - auto-add to session
          itemsToAdd.push(item);
          matchedCount++;
        } else {
          // Low confidence - queue for manual review
          itemsNeedingReview.push(item);
        }
      }

      // Add all matched items to session at once
      if (itemsToAdd.length > 0) {
        setSession(prev => {
          if (!prev) return prev;
          return { ...prev, items: [...prev.items, ...itemsToAdd] };
        });
      }

      // Queue items needing review
      if (itemsNeedingReview.length > 0) {
        setBatchReviewQueue(itemsNeedingReview);
        // Show first one for review
        setPendingItem(itemsNeedingReview[0]);

        // Count completely unrecognized items (empty extractedText = Gemini couldn't read it)
        const unrecognizedCount = itemsNeedingReview.filter(item => !item.extractedText || item.extractedText.trim() === '').length;

        if (unrecognizedCount > 0) {
          // Prominent warning for completely failed items - stays until dismissed
          toast.error(`${unrecognizedCount} image${unrecognizedCount > 1 ? 's' : ''} could not be read - please review manually`, {
            duration: Infinity,
          });
        } else {
          // Regular warning for low-confidence matches - long duration
          toast(`${itemsNeedingReview.length} items need manual review`, { icon: '⚠️', duration: 15000 });
        }
      }

      toast.success(`Batch complete: ${matchedCount}/${response.results.length} auto-matched`, {
        duration: 3000,
      });

      // Clear the batch queue
      setBatchQueue([]);

    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      toast.dismiss('batch-processing');
      
      // Check for specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isOverloaded = errorMessage.includes('503') || 
                          errorMessage.includes('overloaded') || 
                          errorMessage.includes('Service Unavailable');
      const isRateLimited = errorMessage.includes('429') || 
                           errorMessage.includes('busy');
      
      if (isOverloaded) {
        toast.error('Google AI service is temporarily overloaded. Please wait a minute and try again.', {
          duration: 5000,
        });
      } else if (isRateLimited) {
        toast.error('AI service is busy. Please wait a few seconds and try again.', {
          duration: 4000,
        });
      } else {
        toast.error('Batch processing failed. Try processing individually.');
      }
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Helper to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.warn('⚠️ No file selected');
      return;
    }

    console.log(`📸 File selected: ${file.name}, size: ${(file.size / 1024).toFixed(2)} KB`);

    // If batch mode is ON, add to queue instead of processing
    if (batchMode) {
      addToBatchQueue(file);
      event.target.value = ''; // Reset input
      return;
    }

    // Show immediate feedback - non-blocking position at top
    toast.loading('Processing... Keep scanning!', {
      id: 'photo-processing',
      duration: 3000,
      position: 'top-center',
      icon: '🔄',
      style: {
        background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
        color: '#fff',
        fontWeight: '600',
        padding: '14px 28px',
        fontSize: '15px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)',
        marginTop: '20px'
      }
    });

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
    
    // RATE LIMITING: Adjust based on your API tier
    // - FREE tier: 15 RPM = 4000ms delay
    // - PAID tier: 360+ RPM = 200-1000ms delay is safe
    // Using 2000ms (2s) for reliable operation and avoiding 429 errors
    const MIN_DELAY_MS = 2000; // 2 seconds = 30 calls per minute (very safe for all paid tiers)
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
        
        // Dismiss loading and show success
        toast.dismiss('photo-processing');
        toast.success(`Matched: ${result.matchedContact.contact_person || result.matchedContact.company_name}`, {
          duration: 2000,
          icon: '✅'
        });
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
      } else if (result) {
        // Low confidence: Show modal
        console.log(`⚠️ [${processingId}] Low confidence (${(result.confidence * 100).toFixed(0)}%), showing modal`);
        toast.dismiss('photo-processing');
        setPendingItem(result);
      } else {
        console.warn(`⚠️ [${processingId}] No result from processing`);
        toast.dismiss('photo-processing');
      }
    } catch (error) {
      console.error(`❌ [${processingId}] Background processing failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimited = errorMessage.includes('429') ||
                           errorMessage.includes('busy') ||
                           errorMessage.includes('Too Many');

      if (isRateLimited) {
        toast.error('AI is busy - slow down scanning or wait a moment', {
          duration: 3000,
          icon: '⏳'
        });
      } else {
        toast.error('Failed to process one photo. Continue scanning!', { duration: 2000 });
      }
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
      const isRateLimited = errorMessage.includes('429') ||
                           errorMessage.includes('busy') ||
                           errorMessage.includes('Too Many');

      if (isRateLimited) {
        toast.error('AI is busy - please wait a moment and try again', {
          duration: 3000,
          icon: '⏳'
        });
      } else {
        toast.error(`Failed to process photo: ${errorMessage}. Please try again.`);
      }
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

    // Use Gemini smart matching with Tesseract fallback
    console.log('🤖 Using Gemini AI for smart matching...');

    let finalText = '';
    let finalContact: Contact | null = null;
    let finalConfidence = 0;
    let matchReason = 'No match found';

    try {
      const smartResult = await smartMatchWithGemini(photoBlob, contacts);
      console.log('🎯 Gemini smart match result:', smartResult);

      // Check if Gemini had an error (rate limit, etc.)
      if (smartResult.error) {
        throw new Error(smartResult.error);
      }

      finalText = smartResult.extractedText || '';
      finalContact = smartResult.matchedContact || null;
      finalConfidence = smartResult.confidence || 0;
      matchReason = smartResult.matchedContact
        ? `Gemini AI matched: ${smartResult.matchedContact.contact_person || smartResult.matchedContact.company_name}`
        : 'No match found';
    } catch (geminiError) {
      // Fallback to Tesseract OCR + fuzzy matching
      const errorMsg = geminiError instanceof Error ? geminiError.message : '';
      const isQuotaError = errorMsg.toLowerCase().includes('quota') ||
                          errorMsg.includes('limit: 0');
      console.log('⚠️ Gemini failed, falling back to Tesseract OCR...', geminiError);
      toast(isQuotaError
        ? '⚠️ Daily AI quota exhausted - using backup OCR'
        : 'Using backup OCR...', { icon: '🔄', duration: 3000 });

      try {
        const ocrResult = await extractRecipientName(photoBlob);
        console.log('📝 Tesseract OCR result:', ocrResult);

        finalText = ocrResult.text || '';

        if (finalText) {
          // Use fuzzy matching to find contact
          const matchResult = matchContactByName(finalText, contacts);
          if (matchResult) {
            finalContact = matchResult.contact;
            finalConfidence = matchResult.confidence;
            matchReason = `Tesseract+Fuzzy matched: ${matchResult.contact.contact_person || matchResult.contact.company_name}`;
          }
        }
      } catch (ocrError) {
        console.error('❌ Tesseract OCR also failed:', ocrError);
        // Both failed - finalText stays empty
      }
    }

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

    // Check if there are more items in batch review queue
    if (batchReviewQueue.length > 0) {
      const remainingItems = batchReviewQueue.filter(i => i.id !== item.id);
      setBatchReviewQueue(remainingItems);
      if (remainingItems.length > 0) {
        // Show next item for review
        setPendingItem(remainingItems[0]);
        toast(`${remainingItems.length} more items to review`, { icon: '📋', duration: 1500 });
      }
    }

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

    const currentPendingId = pendingItem?.id;
    setPendingItem(null);

    // Check if there are more items in batch review queue
    if (batchReviewQueue.length > 0 && currentPendingId) {
      const remainingItems = batchReviewQueue.filter(i => i.id !== currentPendingId);
      setBatchReviewQueue(remainingItems);
      if (remainingItems.length > 0) {
        // Show next item for review
        setPendingItem(remainingItems[0]);
        toast(`Skipped. ${remainingItems.length} more items to review`, { icon: '⏭️', duration: 1500 });
      }
    }
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

  // Quick send - original behavior (no preview modal)
  const handleBulkSubmit = async () => {
    if (!session) return;

    if (!scannedBy) {
      toast.error('Please select who is scanning');
      return;
    }

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

      // Submit to backend with staff name (no template customization)
      const response = await api.scan.bulkSubmit(items, scannedBy, undefined, undefined, undefined, skipNotification);

      // Success! Use the count of items scanned (not DB records created, which are grouped)
      const scannedCount = items.length;
      const customersNotified = response.notificationsSent || 0;
      
      // Store data for celebration and show celebration button
      setCelebrationData({ scannedCount, customersNotified });
      setIsReadyToCelebrate(true);
      
      // Show success message without celebration yet
      if (skipNotification) {
        toast.success(`${scannedCount} items logged! Click "Celebrate" when ready 🎉`, { duration: 5000 });
      } else {
        toast.success(`${scannedCount} items logged, ${customersNotified} notified! Click "Celebrate" when ready 🎉`, { duration: 5000 });
      }

    } catch (error) {
      console.error('Bulk submit failed:', error);
      toast.error('Failed to submit items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger the celebration (confetti + sound) - manual control for demos
  const triggerCelebration = () => {
    // Confetti animation
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 }
    });

    // Play "You've Got Mail" sound
    const audio = new Audio('/youve-got-mail-sound.mp3');
    audio.play().catch(console.error);

    // Clean up session
    if (session) {
      session.items.forEach(item => {
        if (item.photoPreviewUrl) {
          URL.revokeObjectURL(item.photoPreviewUrl);
        }
      });
    }
    localStorage.removeItem('scanSession');
    sessionStorage.removeItem('scanSessionResumedToast');

    // Navigate back after delay to enjoy the celebration
    setTimeout(() => {
      navigate('/dashboard');
    }, 2500);
  };

  // End session quietly without confetti/sound
  const endSessionQuietly = () => {
    // Clean up session
    if (session) {
      session.items.forEach(item => {
        if (item.photoPreviewUrl) {
          URL.revokeObjectURL(item.photoPreviewUrl);
        }
      });
    }
    localStorage.removeItem('scanSession');
    sessionStorage.removeItem('scanSessionResumedToast');

    // Navigate back immediately
    navigate('/dashboard');
  };

  // Optional: Preview/Edit email before sending
  const handlePreviewEmail = () => {
    if (!session) return;

    if (!scannedBy) {
      toast.error('Please select who is scanning');
      return;
    }

    setShowEmailModal(true);
  };

  const handleConfirmAndSend = async (
    templateId: string,
    customSubject?: string,
    customBody?: string
  ) => {
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

      // Submit to backend with staff name, template, and optional custom content
      const response = await api.scan.bulkSubmit(
        items,
        scannedBy!,
        templateId,
        customSubject,
        customBody,
        skipNotification
      );

      // Success! Use the count of items scanned (not DB records created, which are grouped)
      const scannedCount = items.length;
      const customersNotified = response.notificationsSent || 0;
      
      // Close email modal
      setShowEmailModal(false);
      
      // Store data for celebration and show celebration button
      setCelebrationData({ scannedCount, customersNotified });
      setIsReadyToCelebrate(true);
      
      // Show success message without celebration yet
      if (skipNotification) {
        toast.success(`${scannedCount} items logged! Click "Celebrate" when ready 🎉`, { duration: 5000 });
      } else {
        toast.success(`${scannedCount} items logged, ${customersNotified} notified! Click "Celebrate" when ready 🎉`, { duration: 5000 });
      }

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
        
        {/* Batch Processing Overlay for Demo Mode */}
        {isProcessingBatch && (
          <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
            <img 
              src="/Untitled design.gif" 
              alt="Processing..." 
              className="w-64 h-64 object-contain mb-6"
            />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing your mail...</h3>
            <p className="text-gray-600 text-lg">AI is matching items to customers</p>
            <div className="mt-6 flex items-center gap-2 text-blue-600">
              <Loader className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">This may take a moment</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render: Review Screen
  if (showReview) {
    const grouped = groupItemsByContact();
    const unmatchedItems = session.items.filter(item => !item.matchedContact);

    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Modern Header */}
            <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
              <div className="flex items-center gap-4 mb-3">
                <button
                  onClick={() => setShowReview(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to scanning"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Review Session
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {session.items.length} items scanned • {grouped.length} {grouped.length === 1 ? 'customer' : 'customers'}
                  </p>
                </div>
              </div>
            </div>

            {/* Scanned Items List */}
            <div className="p-6 md:p-8 space-y-3 max-h-96 overflow-y-auto">
              {grouped.map(group => (
                <div key={group.contact.contact_id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {getCustomerDisplayName(group.contact)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Mailbox: <span className="font-medium text-gray-700">{group.contact.mailbox_number}</span>
                      </p>
                      {!skipNotification && (
                        <div className="flex items-center gap-1.5 text-xs text-green-600 mt-2">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Will notify customer</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-3xl font-bold text-gray-900">
                        {group.totalCount}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {group.letterCount > 0 && `${group.letterCount} Letter${group.letterCount > 1 ? 's' : ''}`}
                        {group.letterCount > 0 && group.packageCount > 0 && ', '}
                        {group.packageCount > 0 && `${group.packageCount} Package${group.packageCount > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {unmatchedItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h3 className="font-semibold text-amber-900 mb-1.5 flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    Manual Review Needed ({unmatchedItems.length})
                  </h3>
                  <p className="text-sm text-amber-700">
                    These items couldn't be matched automatically. Please log them manually.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 md:p-8 border-t border-gray-200 bg-gray-50 space-y-5">
              {/* Show Celebrate button after successful submission */}
              {isReadyToCelebrate && celebrationData ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-green-900 mb-2">
                      Successfully Submitted!
                    </h3>
                    <p className="text-green-700">
                      {celebrationData.scannedCount} items logged
                      {!skipNotification && `, ${celebrationData.customersNotified} customers notified`}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={endSessionQuietly}
                      className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-lg font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      End
                    </button>
                    <button
                      onClick={triggerCelebration}
                      className="flex-1 py-4 bg-gray-900 hover:bg-gray-800 text-white text-lg font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>🎉</span>
                      Celebrate
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Staff Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Who is scanning this mail? *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setScannedBy('Madison')}
                        className={`px-5 py-4 rounded-xl border-2 font-semibold transition-all ${
                          scannedBy === 'Madison'
                            ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Madison
                      </button>
                      <button
                        type="button"
                        onClick={() => setScannedBy('Merlin')}
                        className={`px-5 py-4 rounded-xl border-2 font-semibold transition-all ${
                          scannedBy === 'Merlin'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Merlin
                      </button>
                    </div>
                    {!scannedBy && (
                      <p className="mt-2 text-sm text-red-600 font-medium">Please select who is scanning</p>
                    )}
                  </div>

                  {/* Skip Notification Option */}
                  <label className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={skipNotification}
                      onChange={(e) => setSkipNotification(e.target.checked)}
                      className="mt-0.5 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900 block">Skip customer notifications</span>
                      <p className="text-sm text-gray-600 mt-1">
                        Check this if customers don't use email or don't need to be notified. Items will still be logged.
                      </p>
                    </div>
                  </label>
                  
                  {/* Main Action: Quick Send */}
                  <button
                    onClick={handleBulkSubmit}
                    disabled={isSubmitting || grouped.length === 0 || !scannedBy}
                    className="w-full py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-lg font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : skipNotification ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Submit All (No Notifications)
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit All & Send Notifications
                      </>
                    )}
                  </button>

                  {/* Optional: Preview/Edit Email */}
                  <button
                    onClick={handlePreviewEmail}
                    disabled={isSubmitting || grouped.length === 0 || !scannedBy}
                    className="w-full py-3 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 text-base font-medium rounded-xl border border-gray-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Preview/Edit Email First (Optional)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Email Preview Modal - must be inside Review Screen return */}
        {showEmailModal && (
          <BulkScanEmailModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            groups={grouped}
            onConfirm={handleConfirmAndSend}
            sending={isSubmitting}
          />
        )}
      </div>
    );
  }

  // Render: Active Scan Session
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <div className="max-w-full mx-auto px-16 py-3">
          {/* Title */}
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Scan Session</h1>
          </div>
          
          {/* Compact Configuration Panel - All in One Row */}
          <div className="flex items-center gap-4 p-3 bg-white/35 backdrop-blur-sm rounded-lg shadow-sm relative z-10">
            {/* Quick Scan Mode Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="quickScanMode"
                checked={quickScanMode}
                onChange={(e) => setQuickScanMode(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
              />
              <Zap className="w-4 h-4 text-green-600" />
              <label htmlFor="quickScanMode" className="cursor-pointer flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900">Quick Scan</span>
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Recommended</span>
              </label>
              <div className="group relative hover:z-[100]">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="invisible group-hover:visible absolute left-0 top-6 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-[100]">
                  Auto-accept high confidence matches (≥70%) for faster bulk scanning. Uncheck if you want to review each scan manually.
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-gray-300"></div>

            {/* Batch Mode Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="batchMode"
                checked={batchMode}
                onChange={(e) => {
                  setBatchMode(e.target.checked);
                  if (!e.target.checked) {
                    // Clear queue when disabling batch mode
                    batchQueue.forEach(item => URL.revokeObjectURL(item.previewUrl));
                    setBatchQueue([]);
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <DollarSign className="w-4 h-4 text-blue-600" />
              <label htmlFor="batchMode" className="cursor-pointer flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900">Batch Mode</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">10x Savings</span>
              </label>
              <div className="group relative hover:z-[100]">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                <div className="invisible group-hover:visible absolute left-0 top-6 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-[100]">
                  Collect {BATCH_SIZE} photos, then process all at once. Uses 1 API call instead of 10 - saves cost AND avoids rate limits!
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-gray-300"></div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  <span className="font-semibold">{session.items.length}</span> Scanned
                </span>
              </div>
              {quickScanMode && !batchMode && processingQueue > 0 && (
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">{processingQueue}</span> Processing
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  <span className="font-semibold">{contacts.length}</span> Contacts
                </span>
              </div>
            </div>
          </div>

          {/* Batch Queue Status */}
          {batchMode && (
            <div className="mt-2 p-3 bg-white/35 backdrop-blur-sm rounded-lg shadow-sm relative z-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Batch Queue: {batchQueue.length} / {BATCH_SIZE}
                  </span>
                </div>
                {batchQueue.length > 0 && !isProcessingBatch && (
                  <button
                    onClick={processBatchQueue}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    Process {batchQueue.length} Photos
                  </button>
                )}
              </div>

              {/* Batch Queue Thumbnails */}
              {batchQueue.length > 0 ? (
                <div className="flex gap-3 md:gap-4 flex-wrap">
                  {batchQueue.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={item.previewUrl}
                        alt={`Queue ${idx + 1}`}
                        className="w-12 h-12 object-cover rounded-lg border-2 border-blue-300 shadow-sm cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={() => setPreviewImageUrl(item.previewUrl)}
                        title="Click to preview"
                      />
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-semibold shadow">
                        {idx + 1}
                      </span>
                      {/* Delete button - shows on hover */}
                      <button
                        onClick={() => {
                          URL.revokeObjectURL(item.previewUrl);
                          setBatchQueue(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from queue"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-blue-600">
                  Take photos to add to the batch. Photos will be processed together when you click "Process".
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Camera Button - Fixed at bottom, aligned with main content */}
      <div className="fixed bottom-0 left-0 lg:left-72 right-0 p-4 z-20">
        <div className="max-w-4xl mx-auto">
          {/* Counter and Status - Compact Design */}
          {quickScanMode && (session.items.length > 0 || processingQueue > 0) && (
            <div className="mb-2 flex items-center justify-center gap-2 text-sm">
              {session.items.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="text-lg font-bold text-gray-900">{session.items.length}</span>
                  <span className="text-gray-600 text-xs">scanned</span>
                </div>
              )}
              {processingQueue > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                  <Loader className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span className="text-blue-700 text-xs">{processingQueue} processing</span>
                </div>
              )}
            </div>
          )}

          {/* Camera Options - Compact Design */}
          <div className="relative grid grid-cols-2 gap-2">
            {/* Webcam Button */}
            <button
              onClick={handleWebcamClick}
              disabled={isProcessing && !quickScanMode}
              className="py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              title="Use computer webcam"
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Webcam</span>
            </button>

            {/* Upload/Camera Button */}
            <button
              onClick={handleCameraClick}
              disabled={isProcessing && !quickScanMode}
              className="py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              title="Upload image or use phone camera"
            >
              {isProcessing && !quickScanMode ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Processing...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload/Camera</span>
                </>
              )}
            </button>
          </div>

          {/* End Session Button */}
          {session.items.length > 0 && (
            <button
              onClick={() => endSession()}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <XCircle className="w-4 h-4" />
              End Session & Review
            </button>
          )}

          {quickScanMode && processingQueue === 0 && session.items.length > 0 && (
            <p className="text-center text-xs text-gray-500 mt-1.5">
              All photos processed. Keep scanning or end session.
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
      <div className="max-w-full mx-auto px-16 py-6">
        {session.items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <img
              src="/assets/images/Scan-me.png"
              alt="Scan me"
              className="w-64 h-64 mx-auto mb-4"
            />
            {batchMode && batchQueue.length > 0 ? (
              <>
                <p className="text-lg font-medium mb-2 text-blue-600">
                  {batchQueue.length} photo{batchQueue.length > 1 ? 's' : ''} ready to process
                </p>
                <p className="text-sm">Click "Process {batchQueue.length} Photos" above to match with customers</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">No items scanned yet</p>
                <p className="text-sm">Use "Webcam" or "Upload/Camera" below to start scanning</p>
              </>
            )}
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

      {/* Batch Processing Overlay with Cute Animation */}
      {isProcessingBatch && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
          <img 
            src="/Untitled design.gif" 
            alt="Processing..." 
            className="w-64 h-64 object-contain mb-6"
          />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Processing your mail...</h3>
          <p className="text-gray-600 text-lg">AI is matching your mail to customers</p>
          <div className="mt-6 flex items-center gap-2 text-blue-600">
            <Loader className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">This may take a moment</span>
          </div>
        </div>
      )}

      {showEmailModal && (
        <BulkScanEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          groups={groupItemsByContact()}
          onConfirm={handleConfirmAndSend}
          sending={isSubmitting}
        />
      )}

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white hover:bg-gray-100 text-gray-800 rounded-full flex items-center justify-center shadow-lg transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
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
                  {getCustomerDisplayName(contact)} - {contact.mailbox_number}
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
                  {getCustomerDisplayName(contact)} - {contact.mailbox_number}
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

