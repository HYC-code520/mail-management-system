/**
 * Revenue Widget Component
 * 
 * Displays package storage fee revenue metrics:
 * - Monthly revenue (this month's collected fees)
 * - Outstanding fees (pending/owed fees)
 * - Total revenue (all-time collected fees)
 */

import React from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

interface RevenueWidgetProps {
  monthlyRevenue: number;
  outstandingFees: number;
  totalRevenue: number;
  loading?: boolean;
}

export default function RevenueWidget({ 
  monthlyRevenue, 
  outstandingFees, 
  totalRevenue, 
  loading 
}: RevenueWidgetProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-100 rounded-lg"></div>
            <div className="h-24 bg-gray-100 rounded-lg"></div>
            <div className="h-24 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Package Storage Revenue</h2>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* This Month */}
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-sm font-medium text-gray-600">This Month</p>
          </div>
          <p className="text-3xl font-bold text-green-600">
            ${(monthlyRevenue ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Collected</p>
        </div>
        
        {/* Outstanding */}
        <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <p className="text-sm font-medium text-gray-600">Outstanding</p>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            ${(outstandingFees ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Owed</p>
        </div>
        
        {/* Total (All Time) */}
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-gray-600">Total (All Time)</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            ${(totalRevenue ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lifetime</p>
        </div>
      </div>

      {/* Quick Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Tier 2 customers: $2/day per package after 1-day free storage
        </p>
      </div>
    </div>
  );
}

