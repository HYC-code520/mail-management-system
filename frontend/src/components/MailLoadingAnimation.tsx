import React from 'react';

interface MailLoadingAnimationProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

/**
 * A cute mail animation loading component that displays an animated mail gif
 * Used as a loading indicator across the application
 */
export default function MailLoadingAnimation({
  message = 'Loading...',
  size = 'md',
  fullScreen = false
}: MailLoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} relative`}>
        <img
          src="/mail-moving-animation.gif"
          alt="Loading mail animation"
          className="w-full h-full object-contain"
        />
      </div>
      {message && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium animate-pulse`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * A wrapper component that provides consistent loading state layout
 * across pages with the mail animation
 */
export function PageLoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="max-w-full mx-auto px-4 md:px-8 lg:px-16 py-6">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <MailLoadingAnimation message={message} size="lg" />
      </div>
    </div>
  );
}
