/**
 * Quick Actions Section Component
 * 
 * Displays quick action buttons for common tasks on the dashboard.
 */

import React from 'react';
import { Camera, UserPlus, Mail } from 'lucide-react';

interface QuickActionsSectionProps {
  onScanMail: () => void;
  onAddCustomer: () => void;
  onLogMail: () => void;
  followUpCount?: number;
  onNavigateToFollowUps?: () => void;
}

export default function QuickActionsSection({
  onScanMail,
  onAddCustomer,
  onLogMail,
  followUpCount = 0,
  onNavigateToFollowUps
}: QuickActionsSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
        <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={onScanMail}
          className="group relative overflow-hidden flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <Camera className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Scan Mail</span>
        </button>
        <button
          onClick={onAddCustomer}
          className="group relative overflow-hidden flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <UserPlus className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Add Customer</span>
        </button>
        <button
          onClick={onLogMail}
          className="group relative overflow-hidden flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <Mail className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Log New Mail</span>
        </button>
      </div>

      {/* Follow-ups Quick Link Card - Below Quick Actions */}
      {onNavigateToFollowUps && (
        <div className="mt-6">
          <button
            onClick={onNavigateToFollowUps}
            className="w-full bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg border-2 border-orange-200 p-6 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Needs Follow-up</h3>
                  <p className="text-gray-600">
                    {followUpCount} {followUpCount === 1 ? 'customer needs' : 'customers need'} attention
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-white rounded-full text-orange-700 font-bold text-lg shadow-sm">
                  {followUpCount}
                </span>
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

