/**
 * Revenue Widget Component
 * 
 * Displays package storage fee revenue metrics:
 * - Monthly revenue (this month's collected fees)
 * - Outstanding fees (pending/owed fees)
 * - Total revenue (all-time collected fees)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Package Storage Revenue</h2>
            <p className="text-sm text-gray-500">Track your storage fee earnings</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* This Month */}
        <div className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full -mr-8 -mt-8 opacity-50"></div>
          <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-green-800">This Month</p>
            </div>
            <p className="text-3xl font-bold text-green-700 mb-1">
              ${(monthlyRevenue ?? 0).toFixed(2)}
            </p>
            <p className="text-xs text-green-600 font-medium">Collected</p>
          </div>
        </div>
        
        {/* Outstanding - Clickable to navigate to Follow-ups */}
        <div
          className="relative cursor-pointer group"
          onClick={() => navigate('/dashboard/follow-ups')}
          title="View customers who need follow-up"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full -mr-8 -mt-8 opacity-50 -z-10"></div>
          <div className="relative bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border-2 border-orange-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-orange-400 hover:ring-2 hover:ring-orange-300 hover:ring-offset-1 transition-all duration-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-orange-800">Outstanding</p>
            </div>
            <p className="text-3xl font-bold text-orange-700 mb-1">
              ${(outstandingFees ?? 0).toFixed(2)}
            </p>
            <p className="text-xs text-orange-600 font-medium group-hover:underline">Owed - Click to view</p>
          </div>
        </div>
        
        {/* Total (All Time) */}
        <div className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full -mr-8 -mt-8 opacity-50"></div>
          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-blue-800">Total (All Time)</p>
            </div>
            <p className="text-3xl font-bold text-blue-700 mb-1">
              ${(totalRevenue ?? 0).toFixed(2)}
            </p>
            <p className="text-xs text-blue-600 font-medium">Lifetime</p>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="mt-5 pt-5 border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <p className="text-xs font-medium">
            Tier 2 customers: $2/day per package after 1-day free storage
          </p>
        </div>
      </div>
    </div>
  );
}

