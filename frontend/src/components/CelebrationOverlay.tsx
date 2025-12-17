/**
 * Celebration Overlay Component
 * 
 * A full-screen overlay that shows a celebration animation (high-five GIF)
 * when a fee is successfully collected. Renders using a portal to ensure
 * it appears above all other content.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface CelebrationOverlayProps {
  isVisible: boolean;
  amount: string;
  method: string;
  onComplete: () => void;
}

function CelebrationOverlayContent({ amount, method, onComplete }: Omit<CelebrationOverlayProps, 'isVisible'>) {
  useEffect(() => {
    // Auto-dismiss after 3.5 seconds (longer so people can enjoy the celebration!)
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={onComplete}
    >
      <div className="bg-white rounded-3xl p-8 shadow-2xl transform animate-bounce-in flex flex-col items-center max-w-sm mx-4">
        <img 
          src="/highfive-animation.gif" 
          alt="High five celebration!" 
          className="w-48 h-48 object-contain mb-4"
        />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Fee Collected! 🎉</h2>
        <p className="text-xl text-green-600 font-semibold">${amount}</p>
        <p className="text-gray-500 mt-1">via {method}</p>
        <p className="text-xs text-gray-400 mt-4">Click anywhere to dismiss</p>
      </div>
    </div>
  );
}

export default function CelebrationOverlay({ isVisible, amount, method, onComplete }: CelebrationOverlayProps) {
  if (!isVisible) return null;

  // Use portal to render at document body level, ensuring it's always on top
  return createPortal(
    <CelebrationOverlayContent amount={amount} method={method} onComplete={onComplete} />,
    document.body
  );
}
