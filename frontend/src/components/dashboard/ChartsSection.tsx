/**
 * Charts Section Component
 * 
 * Displays Mail Volume and Customer Growth charts with time range selector.
 */

import React from 'react';
import { TrendingUp, UserPlus } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  count?: number;
  customers?: number;
}

interface ChartsSectionProps {
  mailVolumeData: ChartData[];
  customerGrowthData: ChartData[];
  chartTimeRange: 7 | 14 | 30;
  onTimeRangeChange: (range: 7 | 14 | 30) => void;
  loading?: boolean;
}

export default function ChartsSection({
  mailVolumeData,
  customerGrowthData,
  chartTimeRange,
  onTimeRangeChange,
  loading
}: ChartsSectionProps) {
  
  const handleRangeChange = (range: 7 | 14 | 30) => {
    console.log('Chart range changed to:', range);
    onTimeRangeChange(range);
  };

  if (loading) {
    return (
      <div className="lg:col-span-2 space-y-6 h-full animate-pulse">
        <div className="h-12 bg-gray-100 rounded-lg"></div>
        <div className="h-64 bg-gray-100 rounded-lg"></div>
        <div className="h-64 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 space-y-6 h-full">
      {/* Time Range Toggle - Shared for both charts */}
      <div className="flex items-center justify-center gap-2 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRangeChange(7);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            chartTimeRange === 7
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          7 Days
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRangeChange(14);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            chartTimeRange === 14
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          14 Days
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRangeChange(30);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            chartTimeRange === 30
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          30 Days
        </button>
      </div>

      {/* Mail Volume Chart */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-sm h-[calc(50%-3rem)]">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-gray-900" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mail Volume</h2>
            <p className="text-sm text-gray-600">Last {chartTimeRange} days</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={mailVolumeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickLine={{ stroke: '#E5E7EB' }}
              interval={chartTimeRange === 30 ? 6 : chartTimeRange === 14 ? 2 : 1}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={{ stroke: '#E5E7EB' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Customer Growth Chart */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-sm h-[calc(50%-3rem)]">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">New Customers</h2>
            <p className="text-sm text-gray-600">Added per day (last {chartTimeRange} days)</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={customerGrowthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickLine={{ stroke: '#E5E7EB' }}
              interval={chartTimeRange === 30 ? 6 : chartTimeRange === 14 ? 2 : 1}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fill: '#6B7280', fontSize: 12 }}
              tickLine={{ stroke: '#E5E7EB' }}
              allowDecimals={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="customers" 
              stroke="#10B981" 
              strokeWidth={3}
              dot={{ fill: '#10B981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
