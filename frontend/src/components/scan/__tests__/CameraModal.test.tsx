import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CameraModal from '../CameraModal';

// Mock MediaStream
class MockMediaStream {
  private tracks: MediaStreamTrack[] = [];

  constructor() {
    this.tracks = [
      {
        kind: 'video',
        label: 'Mock Camera',
        enabled: true,
        stop: vi.fn(),
      } as unknown as MediaStreamTrack,
    ];
  }

  getTracks() {
    return this.tracks;
  }
}

// Mock video element behavior
const mockVideoElement = {
  srcObject: null as MediaStream | null,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe('CameraModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCapture = vi.fn();
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let originalMediaDevices: typeof navigator.mediaDevices;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Save original
    originalMediaDevices = navigator.mediaDevices;

    // Create mock getUserMedia
    mockGetUserMedia = vi.fn().mockResolvedValue(new MockMediaStream());

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
      configurable: true,
    });

    // Mock HTMLVideoElement methods
    vi.spyOn(HTMLVideoElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLVideoElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <CameraModal
        isOpen={false}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    expect(screen.queryByText('Take Photo')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    expect(screen.getByText('Take Photo')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    expect(screen.getByText('Starting camera...')).toBeInTheDocument();
  });

  it('should request camera access when opened', async () => {
    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });
  });

  it('should call onClose when X button is clicked', () => {
    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    const closeButton = screen.getByTitle('Close camera');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show error message when camera access is denied', async () => {
    mockGetUserMedia.mockRejectedValue(
      Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
    );

    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Camera Error')).toBeInTheDocument();
      expect(screen.getByText(/Camera access denied/i)).toBeInTheDocument();
    });
  });

  it('should show error message when no camera is found', async () => {
    mockGetUserMedia.mockRejectedValue(
      Object.assign(new Error('No camera'), { name: 'NotFoundError' })
    );

    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Camera Error')).toBeInTheDocument();
      expect(screen.getByText(/No camera found/i)).toBeInTheDocument();
    });
  });

  it('should show error message when camera is in use', async () => {
    mockGetUserMedia.mockRejectedValue(
      Object.assign(new Error('Camera in use'), { name: 'NotReadableError' })
    );

    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Camera Error')).toBeInTheDocument();
      expect(screen.getByText(/Camera is already in use/i)).toBeInTheDocument();
    });
  });

  it('should show error when getUserMedia is not supported', async () => {
    // Remove mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Camera Error')).toBeInTheDocument();
    });
  });

  it('should stop camera tracks when closing', async () => {
    const mockStream = new MockMediaStream();
    const stopSpy = vi.fn();
    mockStream.getTracks()[0].stop = stopSpy;
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { rerender } = render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    // Wait for camera to initialize
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    // Close the modal
    rerender(
      <CameraModal
        isOpen={false}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    // Track should be stopped
    expect(stopSpy).toHaveBeenCalled();
  });

  it('should have close button in error state', async () => {
    mockGetUserMedia.mockRejectedValue(
      Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })
    );

    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Camera Error')).toBeInTheDocument();
    });

    // Get the close button in the error message area (the one with text "Close")
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should render video element for camera preview', () => {
    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    // Video element should exist (may be hidden initially)
    const videoElement = document.querySelector('video');
    expect(videoElement).toBeInTheDocument();
  });

  it('should handle generic errors gracefully', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Unknown error'));

    render(
      <CameraModal
        isOpen={true}
        onClose={mockOnClose}
        onCapture={mockOnCapture}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Camera Error')).toBeInTheDocument();
      expect(screen.getByText(/Camera error: Unknown error/i)).toBeInTheDocument();
    });
  });
});

