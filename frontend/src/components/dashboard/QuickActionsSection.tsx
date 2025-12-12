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
}

export default function QuickActionsSection({
  onScanMail,
  onAddCustomer,
  onLogMail
}: QuickActionsSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-6 bg-green-600 rounded-full"></div>
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={onScanMail}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <Camera className="w-5 h-5" />
          <span>Scan Mail</span>
        </button>
        <button
          onClick={onAddCustomer}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Customer</span>
        </button>
        <button
          onClick={onLogMail}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-900 hover:bg-black text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <Mail className="w-5 h-5" />
          <span>Log New Mail</span>
        </button>
      </div>
    </div>
  );
}

