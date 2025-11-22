import React, { useState } from 'react';
import { Package, History } from 'lucide-react';
import IntakePage from './Intake';
import LogPage from './Log';

export default function MailManagementPage() {
  const [activeTab, setActiveTab] = useState<'intake' | 'history'>('intake');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mail Management</h1>
        <p className="text-gray-600">Log new mail and manage historical records</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('intake')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
              activeTab === 'intake'
                ? 'text-green-600 border-b-2 border-green-600 -mb-[1px]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Intake</span>
            <span className="text-xs text-gray-500 ml-1">(Log New Mail)</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
              activeTab === 'history'
                ? 'text-green-600 border-b-2 border-green-600 -mb-[1px]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-5 h-5" />
            <span>History</span>
            <span className="text-xs text-gray-500 ml-1">(View All Records)</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'intake' && (
          <div className="animate-fadeIn">
            <IntakePage embedded={true} />
          </div>
        )}
        {activeTab === 'history' && (
          <div className="animate-fadeIn">
            <LogPage embedded={true} />
          </div>
        )}
      </div>
    </div>
  );
}

