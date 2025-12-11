# Webcam Feature for Mail Scanning

## Overview
Added webcam support to the scan page, allowing users to take photos directly from their computer/laptop camera instead of just uploading files or using mobile camera.

## Features

### 1. **CameraModal Component**
Location: `frontend/src/components/scan/CameraModal.tsx`

- Full-screen camera interface with live video preview
- Switch between front and back cameras (if available)
- High-quality photo capture (1920x1080 ideal resolution)
- Comprehensive error handling for:
  - Permission denied
  - No camera found
  - Camera already in use
  - Other camera access errors
- Clean UI with gradient overlays and intuitive controls

### 2. **Dual Camera Options in Scan Page**
Location: `frontend/src/pages/ScanSession.tsx`

The scan page now has two camera buttons:
- **Webcam Button** (Purple) - Opens live webcam modal for desktop/laptop
- **Upload/Camera Button** (Blue) - Original file upload or mobile camera

### 3. **User Experience**
- Webcam modal opens in full screen with black background
- Live video preview shows what will be captured
- Large circular capture button (mimics native camera apps)
- Switch camera button to toggle between front/back cameras
- Automatic cleanup of camera resources when modal closes
- Error messages displayed clearly if camera access fails

## Browser Compatibility

Uses standard Web APIs:
- `navigator.mediaDevices.getUserMedia()` for camera access
- Works in all modern browsers (Chrome, Edge, Firefox, Safari)
- Requires HTTPS in production (or localhost in development)

## User Permissions

First time users will see a browser prompt asking for camera permission:
- "Allow" - Camera access granted, feature works
- "Block" - User sees friendly error message with instructions

## Integration with Existing Flow

The webcam feature seamlessly integrates with existing scan functionality:
1. User clicks "Webcam" button
2. Camera modal opens with live preview
3. User positions mail item and taps capture button
4. Photo is processed using same OCR/AI matching pipeline
5. Results shown in confirm modal (just like file upload)

## Technical Details

### Camera Constraints
```typescript
{
  video: {
    facingMode: 'environment', // Back camera (or 'user' for front)
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  },
  audio: false
}
```

### Photo Capture
- Uses HTML5 Canvas to capture current video frame
- Exports as JPEG with 95% quality
- Blob format for easy processing

### Quick Scan Mode Support
- Works in both Quick Scan (background processing) and regular mode
- Same behavior as file upload for consistency

## Benefits

1. **Desktop Users**: No need to take photo on phone and upload
2. **Faster Workflow**: Direct capture from computer webcam
3. **Better Quality**: Can use high-quality webcams for clearer text recognition
4. **Flexibility**: Users can choose between webcam, file upload, or mobile camera

## Future Enhancements

Possible improvements:
- Add zoom controls
- Flash/brightness adjustment (if supported)
- Multiple photo capture in sequence
- QR code scanning mode
- Barcode reading

