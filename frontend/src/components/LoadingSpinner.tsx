import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  fullScreen = false,
  size = 'md'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

// Progress bar component for longer operations
interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  fullScreen?: boolean;
}

export function ProgressBar({ progress, message, fullScreen = false }: ProgressBarProps) {
  const content = (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{message || 'Loading...'}</span>
        <span className="text-sm font-medium text-blue-600">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-50 p-6">
        <div className="mb-6">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
        {content}
      </div>
    );
  }

  return content;
}

// Skeleton loader for content placeholders
export function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  );
}

// Table skeleton for data tables
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-12 bg-gray-200 rounded flex-1" />
          <div className="h-12 bg-gray-200 rounded flex-1" />
          <div className="h-12 bg-gray-200 rounded flex-1" />
          <div className="h-12 bg-gray-200 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

