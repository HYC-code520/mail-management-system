import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  blue: '#3B82F6',
  purple: '#A855F7',
  green: '#10B981',
  red: '#EF4444',
  yellow: '#FCD34D',  // Bright yellow matching "4-7 days" bar
  orange: '#F97316',
  pink: '#EC4899',
  indigo: '#6366F1',
  teal: '#14B8A6',
  gray: '#6B7280',
};

interface AnalyticsData {
  avgResponseTime: number;
  responseTimeBreakdown: {
    emailCustomers: number;
    walkInCustomers: number;
    totalPickups: number;
  };
  activeCustomers: number;
  inactiveCustomers: number;
  serviceTiers: { tier1: number; tier2: number };
  languageDistribution: { English: number; Chinese: number; Both: number };
  statusDistribution: { [key: string]: number };
  paymentDistribution: { Cash: number; Zelle: number; Venmo: number; PayPal: number; Check: number; Other: number };
  ageDistribution: { '0-3': number; '4-7': number; '8-14': number; '15-30': number; '30+': number };
  staffPerformance: { Merlin: number; Madison: number };
  comparison: {
    thisMonth: { mail: number; customers: number };
    lastMonth: { mail: number; customers: number };
  };
}

interface AnalyticsSectionProps {
  analytics: AnalyticsData;
  loading: boolean;
}

export default function AnalyticsSection({ analytics, loading }: AnalyticsSectionProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const serviceTierData = [
    { name: 'Tier 1', value: analytics.serviceTiers.tier1, color: COLORS.blue },
    { name: 'Tier 2', value: analytics.serviceTiers.tier2, color: COLORS.purple },
  ];

  const languageData = [
    { name: 'English', value: analytics.languageDistribution.English, color: COLORS.blue },
    { name: 'Chinese', value: analytics.languageDistribution.Chinese, color: COLORS.red },
    { name: 'Both', value: analytics.languageDistribution.Both, color: COLORS.purple },
  ].filter(item => item.value > 0);

  const statusData = Object.entries(analytics.statusDistribution)
    .map(([name, value]) => {
      let color = COLORS.gray;
      if (name === 'Received') color = COLORS.blue;
      else if (name === 'Notified') color = COLORS.green;
      else if (name === 'Scanned') color = COLORS.orange;
      else if (name === 'Ready for Pickup') color = COLORS.purple;
      else if (name === 'Picked Up') color = COLORS.purple;
      else if (name === 'Abandoned' || name === 'Abandoned Package') color = COLORS.yellow;
      else if (name === 'Forward') color = COLORS.teal;
      return { name, value, color };
    })
    .filter(item => item.value > 0);

  const paymentData = Object.entries(analytics.paymentDistribution)
    .map(([name, value]) => {
      let color = COLORS.blue;
      const lowerName = name.toLowerCase();
      if (lowerName === 'cash') color = COLORS.green;
      else if (lowerName === 'check') color = COLORS.blue;
      else if (lowerName === 'zelle') color = COLORS.purple;
      else if (lowerName === 'venmo') color = COLORS.pink;
      else if (lowerName === 'paypal') color = COLORS.indigo;
      else if (lowerName === 'other') color = COLORS.orange;
      return { name, value, color };
    })
    .filter(item => item.value > 0);

  return (
    <div className="space-y-8">
      {/* Customer Activity Section - One Horizontal Line with 4 Compact Pie Charts */}
      <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Service Tiers */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Service Tiers</p>
            <div className="flex items-center gap-2">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie
                    data={serviceTierData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {serviceTierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-xs text-gray-600 space-y-1.5 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: COLORS.blue}}></div>
                  <span className="font-medium text-xs">T1: {analytics.serviceTiers.tier1}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: COLORS.purple}}></div>
                  <span className="font-medium text-xs">T2: {analytics.serviceTiers.tier2}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Language */}
          {languageData.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">Language</p>
              <div className="flex items-center gap-2">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-xs text-gray-600 space-y-1.5 flex-1">
                  {languageData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: item.color}}></div>
                      <span className="font-medium text-xs truncate">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          {statusData.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">Mail Status</p>
              <div className="flex items-center gap-2">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-xs text-gray-600 space-y-1 flex-1">
                  {statusData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: item.color}}></div>
                      <span className="font-medium text-xs truncate">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          {paymentData.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">Payment</p>
              <div className="flex items-center gap-2">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-xs text-gray-600 space-y-1.5 flex-1">
                  {paymentData.slice(0, 3).map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: item.color}}></div>
                      <span className="font-medium text-xs truncate">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
