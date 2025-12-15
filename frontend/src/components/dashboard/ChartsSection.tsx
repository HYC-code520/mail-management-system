/**
 * Charts Section Component
 * 
 * Displays Mail Volume and Customer Growth charts with time range selector.
 */

import React from 'react';
import { TrendingUp, UserPlus, Loader2 } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
    if (loading) return; // Prevent multiple clicks while loading
    onTimeRangeChange(range);
  };

  // Format date label - show M T W T F S S for 7 days view
  const formatDateLabel = (dateStr: string) => {
    if (chartTimeRange === 7) {
      const date = new Date(dateStr);
      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      return days[date.getDay()];
    }
    return dateStr;
  };

  // Find max value for highlighting
  const maxMailCount = Math.max(...mailVolumeData.map(d => d.count || 0));

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 h-full flex flex-col">
      {/* Time Range Toggle */}
      <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-50 to-purple-50 p-1 rounded-lg shadow-sm border border-blue-100 mb-3">
        {[7, 14, 30].map((range) => (
          <button
            key={range}
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRangeChange(range as 7 | 14 | 30);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              chartTimeRange === range
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                : 'text-blue-600 hover:text-blue-800 hover:bg-white/40'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {range} Days
          </button>
        ))}
        {loading && (
          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin ml-1" />
        )}
      </div>

      {/* Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Mail Volume Chart */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Mail Volume</h2>
              <p className="text-xs text-gray-500">Last {chartTimeRange} days</p>
            </div>
          </div>
          
          {/* Chart container with fixed height */}
          <div className="relative" style={{ height: '180px' }}>
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mailVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  interval={chartTimeRange === 30 ? 6 : chartTimeRange === 14 ? 2 : 0}
                  angle={chartTimeRange === 7 ? 0 : -45}
                  textAnchor={chartTimeRange === 7 ? 'middle' : 'end'}
                  height={chartTimeRange === 7 ? 30 : 50}
                  tickFormatter={formatDateLabel}
                />
                <YAxis 
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {mailVolumeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count === maxMailCount ? '#3B82F6' : '#93C5FD'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Growth Chart */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <UserPlus className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">New Customers</h2>
              <p className="text-xs text-gray-500">Last {chartTimeRange} days</p>
            </div>
          </div>
          
          {/* Chart container with fixed height */}
          <div className="relative" style={{ height: '180px' }}>
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={customerGrowthData}>
                <defs>
                  <linearGradient id="customerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="50%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  interval={chartTimeRange === 30 ? 6 : chartTimeRange === 14 ? 2 : 0}
                  angle={chartTimeRange === 7 ? 0 : -45}
                  textAnchor={chartTimeRange === 7 ? 'middle' : 'end'}
                  height={chartTimeRange === 7 ? 30 : 50}
                  tickFormatter={formatDateLabel}
                />
                <YAxis 
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="customers"
                  stroke="#10B981"
                  strokeWidth={3}
                  fill="url(#customerGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
