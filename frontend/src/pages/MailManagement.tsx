import React from 'react';
import { useNavigate } from 'react-router-dom';
import LogPage from './Log';

export default function MailManagementPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-full mx-auto px-16 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mail Log</h1>
        <button
          onClick={() => navigate('/dashboard/scan')}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan Mail
        </button>
      </div>

      {/* Content */}
      <LogPage embedded={true} showAddForm={true} />
    </div>
  );
}

