/**
 * Quick Actions Section Component
 * 
 * Displays quick action buttons for common tasks on the dashboard.
 */

import React from 'react';
import { FileText, UserPlus, Mail } from 'lucide-react';

interface QuickActionsSectionProps {
  onViewTemplates: () => void;
  onAddCustomer: () => void;
  onLogMail: () => void;
}

export default function QuickActionsSection({
  onViewTemplates,
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
          onClick={onViewTemplates}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <FileText className="w-5 h-5" />
          <span>View Email Templates</span>
        </button>
        <button
          onClick={onAddCustomer}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Customer</span>
        </button>
        <button
          onClick={onLogMail}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          <Mail className="w-5 h-5" />
          <span>Log New Mail</span>
        </button>
      </div>
    </div>
  );
}

