import { describe, it, expect, vi, beforeEach } from 'vitest';
import { smartMatchWithGemini } from '../smartMatch';
import { api } from '../../lib/api-client';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  api: {
    scan: {
      smartMatch: vi.fn()
    }
  }
}));

// Mock image compression
global.Image = class {
  width = 1920;
  height = 1080;
  onload = () => {};
  src = '';
  constructor() {
    setTimeout(() => {
      this.onload();
    }, 0);
  }
} as any;

global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  canvas: {
    toBlob: (callback: any) => {
      callback(new Blob(['compressed'], { type: 'image/jpeg' }));
    }
  }
})) as any;

global.HTMLCanvasElement.prototype.toBlob = vi.fn(function(callback) {
  callback(new Blob(['compressed'], { type: 'image/jpeg' }));
});

const mockContacts = [
  {
    contact_id: '1',
    contact_person: 'John Doe',
    company_name: 'Acme Corp',
    mailbox_number: 'A1'
  },
  {
    contact_id: '2',
    contact_person: 'Jane Smith',
    company_name: 'Tech Inc',
    mailbox_number: 'B2'
  },
  {
    contact_id: '3',
    contact_person: 'Houyu Chen',
    company_name: 'Chen Enterprises',
    mailbox_number: 'C3'
  }
];

describe('smartMatchWithGemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully match with high confidence', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'JOHN DOE',
      matchedContact: mockContacts[0],
      confidence: 0.98
    });

    const result = await smartMatchWithGemini(mockBlob, mockContacts);

    expect(result).toEqual({
      extractedText: 'JOHN DOE',
      matchedContact: mockContacts[0],
      confidence: 0.98
    });

    expect(api.scan.smartMatch).toHaveBeenCalled();
  });

  it('should handle name variations', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    // Test "HOU YU CHEN" (with space) matching "Houyu Chen"
    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'HOU YU CHEN',
      matchedContact: mockContacts[2],
      confidence: 0.95
    });

    const result = await smartMatchWithGemini(mockBlob, mockContacts);

    expect(result.matchedContact).toEqual(mockContacts[2]);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should handle reversed name order', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    // Test "CHEN HOUYU" (last name first) matching "Houyu Chen"
    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'CHEN HOUYU',
      matchedContact: mockContacts[2],
      confidence: 0.92
    });

    const result = await smartMatchWithGemini(mockBlob, mockContacts);

    expect(result.matchedContact).toEqual(mockContacts[2]);
  });

  it('should return null for no match', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'UNKNOWN PERSON',
      matchedContact: null,
      confidence: 0.1
    });

    const result = await smartMatchWithGemini(mockBlob, mockContacts);

    expect(result.matchedContact).toBeNull();
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should handle API errors', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    (api.scan.smartMatch as any).mockRejectedValue(new Error('Network error'));

    const result = await smartMatchWithGemini(mockBlob, mockContacts);
    
    // Should return error result, not throw
    expect(result.matchedContact).toBeNull();
    expect(result.error).toBeDefined();
  });

  it('should compress large images', async () => {
    const mockBlob = new Blob(['x'.repeat(5 * 1024 * 1024)], { type: 'image/jpeg' }); // 5MB

    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'TEST',
      matchedContact: null,
      confidence: 0.5
    });

    await smartMatchWithGemini(mockBlob, mockContacts);

    // Should have called the API (compression happens before the call)
    expect(api.scan.smartMatch).toHaveBeenCalled();
  });

  it('should send contact list to backend', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'JOHN DOE',
      matchedContact: mockContacts[0],
      confidence: 0.98
    });

    await smartMatchWithGemini(mockBlob, mockContacts);

    expect(api.scan.smartMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        image: expect.any(String), // base64
        mimeType: 'image/jpeg',
        contacts: mockContacts
      })
    );
  });

  it('should handle mailbox number matching', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    // Test matching by mailbox number when name is unclear
    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'BOX A1',
      matchedContact: mockContacts[0],
      confidence: 0.85
    });

    const result = await smartMatchWithGemini(mockBlob, mockContacts);

    expect(result.matchedContact?.mailbox_number).toBe('A1');
  });

  it('should handle company name matching', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    // Test matching by company name
    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'TECH INC',
      matchedContact: mockContacts[1],
      confidence: 0.9
    });

    const result = await smartMatchWithGemini(mockBlob, mockContacts);

    expect(result.matchedContact?.company_name).toBe('Tech Inc');
  });

  it('should handle confidence threshold edge cases', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    // Test exactly at threshold (0.75)
    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'JOHN DOE',
      matchedContact: mockContacts[0],
      confidence: 0.75
    });

    const result = await smartMatchWithGemini(mockBlob, mockContacts);

    expect(result.confidence).toBe(0.75);
    expect(result.matchedContact).not.toBeNull();
  });

  it('should handle empty contacts array', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

    (api.scan.smartMatch as any).mockResolvedValue({
      extractedText: 'JOHN DOE',
      matchedContact: null,
      confidence: 0.0
    });

    const result = await smartMatchWithGemini(mockBlob, []);

    expect(result.matchedContact).toBeNull();
  });
});

