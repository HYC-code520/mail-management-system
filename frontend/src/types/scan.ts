export interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
  email?: string;
  unit_number?: string;
  status?: string;
}

export interface ScannedItem {
  id: string;
  photoBlob?: Blob; // Temporary, for preview only
  photoPreviewUrl?: string; // Object URL for thumbnail
  extractedText: string;
  matchedContact: Contact | null;
  confidence: number;
  itemType: 'Letter' | 'Package';
  status: 'matched' | 'uncertain' | 'failed';
  scannedAt: string; // ISO timestamp
}

export interface ScanSession {
  sessionId: string;
  items: ScannedItem[];
  startedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp (4 hours from start)
}

export interface GroupedScanResult {
  contact: Contact;
  items: ScannedItem[];
  letterCount: number;
  packageCount: number;
  totalCount: number;
}

export interface BulkSubmitItem {
  contact_id: string;
  item_type: 'Letter' | 'Package';
  scanned_at: string;
}

export interface BulkSubmitResponse {
  success: boolean;
  itemsCreated: number;
  notificationsSent: number;
  summary: Array<{
    contact_id: string;
    contact_name: string;
    letterCount: number;
    packageCount: number;
    notificationSent: boolean;
    error?: string;
  }>;
  errors?: string[];
}


