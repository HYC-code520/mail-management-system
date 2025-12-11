import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoBlob: Blob) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    console.log('📷 Starting camera...');
    
    try {
      setError(null);
      setIsCameraReady(false);

      // Stop existing stream if any
      stopCamera();

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser');
      }

      // Request camera access - try simple constraints first for maximum compatibility
      console.log('📷 Requesting camera access...');
      let stream: MediaStream;
      
      try {
        // First try: simple video constraint (most compatible)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        console.log('📷 Got camera stream with simple constraints');
      } catch (firstError) {
        console.warn('📷 Simple constraints failed, trying with resolution:', firstError);
        // Second try: with resolution hints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        console.log('📷 Got camera stream with resolution constraints');
      }

      streamRef.current = stream;
      console.log('📷 Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, label: t.label, enabled: t.enabled })));

      // Wait a moment for the video element to be in DOM
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!videoRef.current) {
        console.error('📷 Video element not found!');
        throw new Error('Video element not ready');
      }

      console.log('📷 Attaching stream to video element...');
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready to play
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current;
        if (!video) {
          reject(new Error('Video ref lost'));
          return;
        }

        const handleCanPlay = () => {
          console.log('📷 Video can play!');
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
          video.play()
            .then(() => {
              console.log('📷 Video playing successfully!');
              setIsCameraReady(true);
              resolve();
            })
            .catch((playError) => {
              console.error('📷 Video play failed:', playError);
              reject(playError);
            });
        };

        const handleError = (e: Event) => {
          console.error('📷 Video error:', e);
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
          reject(new Error('Video element error'));
        };

        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);

        // Timeout after 10 seconds
        setTimeout(() => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
          reject(new Error('Camera timeout - video not ready after 10 seconds'));
        }, 10000);
      });
      
    } catch (err) {
      console.error('📷 Camera access error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera access denied. Please allow camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is already in use by another application.');
        } else if (err.name === 'OverconstrainedError') {
          setError('Camera does not support the requested settings.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Please check your browser permissions.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        handleClose();
      }
    }, 'image/jpeg', 0.95);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h3 className="text-white font-semibold text-lg">Take Photo</h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            title="Close camera"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="w-full h-full flex items-center justify-center">
        {error ? (
          <div className="text-center p-6 max-w-md">
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 mb-4">
              <Camera className="w-16 h-16 mx-auto mb-4 text-red-300" />
              <p className="text-white text-lg font-semibold mb-2">Camera Error</p>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Video element - always in DOM so we can attach stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isCameraReady ? 'hidden' : ''}`}
            />
            {/* Loading overlay */}
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-white/50 animate-pulse" />
                  <p className="text-white text-lg">Starting camera...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Bottom Controls */}
      {isCameraReady && !error && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-8">
          <div className="flex items-center justify-center gap-8 max-w-4xl mx-auto">
            {/* Switch Camera Button (only show if multiple cameras might be available) */}
            <button
              onClick={switchCamera}
              className="p-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              title="Switch camera"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </button>

            {/* Capture Button */}
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white hover:bg-gray-200 transition-all shadow-2xl flex items-center justify-center border-4 border-white/50"
              title="Take photo"
            >
              <div className="w-16 h-16 rounded-full bg-white border-4 border-gray-300"></div>
            </button>

            {/* Spacer for symmetry */}
            <div className="w-14"></div>
          </div>

          <p className="text-center text-white/80 text-sm mt-4">
            Position the mail item in the frame and tap to capture
          </p>
        </div>
      )}
    </div>
  );
}

