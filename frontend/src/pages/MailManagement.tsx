import React from 'react';
import LogPage from './Log';

export default function MailManagementPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mail Log</h1>
        <p className="text-gray-600">Add new mail and view complete history</p>
      </div>

      {/* Content */}
      <LogPage embedded={true} showAddForm={true} />
    </div>
  );
}

