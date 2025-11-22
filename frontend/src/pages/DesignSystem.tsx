import React, { useState } from 'react';
import { 
  Palette, Type, Layers, Grid, Languages, 
  Mail, Package, Bell, Clock, User, FileText, Settings,
  ChevronRight, Plus, Search, Calendar, Eye, Copy, Check
} from 'lucide-react';

export default function DesignSystem() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(label);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Color palette definitions
  const colors = {
    brand: [
      { name: 'Green 700', value: '#15803d', token: 'green-700', usage: 'Primary brand color, headings' },
      { name: 'Green 600', value: '#16a34a', token: 'green-600', usage: 'Hover states' },
      { name: 'Green 500', value: '#22c55e', token: 'green-500', usage: 'Dark mode brand color' },
      { name: 'Green 100', value: '#dcfce7', token: 'green-100', usage: 'Light backgrounds' },
    ],
    neutral: [
      { name: 'Background', value: '#ffffff', token: '--background', usage: 'Main background' },
      { name: 'Card', value: '#ffffff', token: '--card', usage: 'Card backgrounds' },
      { name: 'Muted', value: '#ececf0', token: '--muted', usage: 'Subtle backgrounds' },
      { name: 'Accent', value: '#e9ebef', token: '--accent', usage: 'Hover backgrounds' },
      { name: 'Border', value: 'rgba(0, 0, 0, 0.1)', token: '--border', usage: 'Dividers, borders' },
    ],
    text: [
      { name: 'Foreground', value: 'oklch(0.145 0 0)', token: '--foreground', usage: 'Primary text' },
      { name: 'Muted Foreground', value: '#717182', token: '--muted-foreground', usage: 'Secondary text' },
    ],
    semantic: [
      { name: 'Destructive', value: '#d4183d', token: '--destructive', usage: 'Error states, delete actions' },
      { name: 'Primary', value: '#030213', token: '--primary', usage: 'Primary buttons' },
    ]
  };

  // Typography scale
  const typography = [
    { name: 'h1', size: 'var(--text-2xl)', weight: '500', usage: 'Page titles' },
    { name: 'h2', size: 'var(--text-xl)', weight: '500', usage: 'Section headings' },
    { name: 'h3', size: 'var(--text-lg)', weight: '500', usage: 'Card titles' },
    { name: 'h4', size: 'var(--text-base)', weight: '500', usage: 'Subsection headings' },
    { name: 'p / body', size: 'var(--text-base)', weight: '400', usage: 'Body text' },
    { name: 'label', size: 'var(--text-base)', weight: '500', usage: 'Form labels' },
    { name: 'button', size: 'var(--text-base)', weight: '500', usage: 'Button text' },
  ];

  // Spacing scale
  const spacing = [
    { value: '0.25rem', pixels: '4px', usage: 'Minimal gaps' },
    { value: '0.5rem', pixels: '8px', usage: 'Tight spacing' },
    { value: '1rem', pixels: '16px', usage: 'Default spacing' },
    { value: '1.5rem', pixels: '24px', usage: 'Medium spacing' },
    { value: '2rem', pixels: '32px', usage: 'Large spacing' },
    { value: '3rem', pixels: '48px', usage: 'Extra large spacing' },
  ];

  // Icons used in the app
  const icons = [
    { icon: Mail, name: 'Mail', usage: 'Mail items' },
    { icon: Package, name: 'Package', usage: 'Package items' },
    { icon: Bell, name: 'Bell', usage: 'Notifications' },
    { icon: Clock, name: 'Clock', usage: 'Pending status' },
    { icon: User, name: 'User', usage: 'Customers' },
    { icon: FileText, name: 'FileText', usage: 'Templates, logs' },
    { icon: Settings, name: 'Settings', usage: 'Configuration' },
    { icon: Search, name: 'Search', usage: 'Search functionality' },
    { icon: Calendar, name: 'Calendar', usage: 'Date selection' },
    { icon: Eye, name: 'Eye', usage: 'View details' },
    { icon: Plus, name: 'Plus', usage: 'Add new items' },
    { icon: ChevronRight, name: 'ChevronRight', usage: 'Navigation' },
  ];

  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'components' | 'icons'>('colors');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="mb-2">Design System</h1>
        <p className="text-gray-600">
          Complete documentation of design tokens, components, and patterns used in Mei Way Mail Plus
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('colors')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'colors'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Colors
          </button>
          <button
            onClick={() => setActiveTab('typography')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'typography'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Typography
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'components'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Components
          </button>
          <button
            onClick={() => setActiveTab('icons')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'icons'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Icons
          </button>
        </div>
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand" />
            <h2>Color System</h2>
          </div>
          <p className="text-gray-600">
            Our color palette features muted green accents for the Mei Way brand identity, combined with a neutral base for clarity and professionalism.
          </p>

          {/* Brand Colors */}
          <div className="space-y-4">
            <h3 className="text-brand">Brand Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {colors.brand.map((color, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                  <div 
                    className="h-20 rounded-lg border shadow-sm"
                    style={{ backgroundColor: color.value }}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{color.name}</p>
                      <button
                        onClick={() => copyToClipboard(color.value, color.name)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {copiedColor === color.name ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <code className="text-sm text-gray-600 block">{color.value}</code>
                    <p className="text-sm text-gray-500 mt-1">{color.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Neutral Colors */}
          <div className="space-y-4">
            <h3>Neutral Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {colors.neutral.map((color, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                  <div 
                    className="h-16 rounded-lg border shadow-sm"
                    style={{ backgroundColor: color.value }}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{color.name}</p>
                      <button
                        onClick={() => copyToClipboard(color.value, color.name)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {copiedColor === color.name ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <code className="text-sm text-gray-600 block">{color.token}</code>
                    <p className="text-sm text-gray-500 mt-1">{color.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Text & Semantic Colors */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3>Text Colors</h3>
              <div className="space-y-3">
                {colors.text.map((color, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg border shadow-sm flex-shrink-0"
                        style={{ backgroundColor: color.value }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{color.name}</p>
                          <button
                            onClick={() => copyToClipboard(color.value, color.name)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            {copiedColor === color.name ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <code className="text-sm text-gray-600 block truncate">{color.token}</code>
                        <p className="text-sm text-gray-500">{color.usage}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3>Semantic Colors</h3>
              <div className="space-y-3">
                {colors.semantic.map((color, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg border shadow-sm flex-shrink-0"
                        style={{ backgroundColor: color.value }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{color.name}</p>
                          <button
                            onClick={() => copyToClipboard(color.value, color.name)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            {copiedColor === color.name ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <code className="text-sm text-gray-600 block truncate">{color.token}</code>
                        <p className="text-sm text-gray-500">{color.usage}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-brand" />
            <h2>Typography System</h2>
          </div>
          <p className="text-gray-600">
            Large, clear text optimized for readability. Typography is defined in index.css with system defaults.
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="space-y-8">
              {/* Typography Scale */}
              <div>
                <h3 className="mb-4">Type Scale</h3>
                <div className="space-y-6">
                  {typography.map((type, i) => (
                    <div key={i}>
                      <div className="grid md:grid-cols-[1fr_2fr] gap-4 items-start">
                        <div className="space-y-1">
                          <code className="text-sm font-medium">{type.name}</code>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <div>Size: {type.size}</div>
                            <div>Weight: {type.weight}</div>
                            <div className="text-xs">{type.usage}</div>
                          </div>
                        </div>
                        <div>
                          {type.name === 'h1' && <h1>Sample Heading</h1>}
                          {type.name === 'h2' && <h2>Sample Heading</h2>}
                          {type.name === 'h3' && <h3>Sample Heading</h3>}
                          {type.name === 'h4' && <h4>Sample Heading</h4>}
                          {type.name === 'p / body' && <p>The quick brown fox jumps over the lazy dog.</p>}
                          {type.name === 'label' && <label className="font-medium">Form Label</label>}
                          {type.name === 'button' && <button className="px-4 py-2 bg-gray-200 rounded-lg font-medium">Button Text</button>}
                        </div>
                      </div>
                      {i < typography.length - 1 && <hr className="mt-6 border-gray-200" />}
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Spacing */}
              <div>
                <h3 className="mb-4">Spacing Scale</h3>
                <div className="space-y-3">
                  {spacing.map((space, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium">{space.value}</div>
                      <div className="w-20 text-sm text-gray-600">{space.pixels}</div>
                      <div 
                        className="bg-green-200 h-8 rounded"
                        style={{ width: space.value }}
                      />
                      <div className="text-sm text-gray-600">{space.usage}</div>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Border Radius */}
              <div>
                <h3 className="mb-4">Border Radius</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="bg-gray-100 h-16 rounded-sm border" />
                    <div className="text-sm">
                      <code>rounded-sm</code>
                      <p className="text-gray-600">0.225rem</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-gray-100 h-16 rounded-md border" />
                    <div className="text-sm">
                      <code>rounded-md</code>
                      <p className="text-gray-600">0.425rem</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-gray-100 h-16 rounded-lg border" />
                    <div className="text-sm">
                      <code>rounded-lg</code>
                      <p className="text-gray-600">0.625rem</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-gray-100 h-16 rounded-xl border" />
                    <div className="text-sm">
                      <code>rounded-xl</code>
                      <p className="text-gray-600">1.025rem</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Components Tab */}
      {activeTab === 'components' && (
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand" />
            <h2>Component Library</h2>
          </div>
          <p className="text-gray-600">
            Core components used throughout the application for consistency and accessibility.
          </p>

          <div className="space-y-6">
            {/* Buttons */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="mb-4">Buttons</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-3">Available variants:</p>
                  <div className="flex flex-wrap gap-3">
                    <button className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors">
                      Primary
                    </button>
                    <button className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors">
                      Secondary
                    </button>
                    <button className="px-6 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-semibold rounded-lg transition-colors">
                      Outline
                    </button>
                    <button className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-300 text-red-600 font-semibold rounded-lg transition-colors">
                      Destructive
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="mb-4">Badges</h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Used for status indicators throughout the application:
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <span className="badge-pending">Pending</span>
                    <span className="text-xs text-gray-600">Pending status</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="badge-notified">Notified</span>
                    <span className="text-xs text-gray-600">Notified status</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="badge-active">Active</span>
                    <span className="text-xs text-gray-600">Active status</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="badge-neutral">Neutral</span>
                    <span className="text-xs text-gray-600">Neutral status</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="mb-4">Form Inputs</h3>
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Text Input</label>
                  <input 
                    type="text" 
                    placeholder="Enter text..."
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Select</label>
                  <select className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand">
                    <option>Option 1</option>
                    <option>Option 2</option>
                    <option>Option 3</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="mb-4">Cards</h3>
              <p className="text-sm text-gray-600 mb-4">
                Cards are the primary container for grouped content. Used extensively in Dashboard for summary statistics.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-brand" />
                    <h4>Example Card</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Card content goes here</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-brand" />
                    <h4>Example Card</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Card content goes here</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 text-brand" />
                    <h4>Example Card</h4>
                  </div>
                  <p className="text-gray-600 text-sm">Card content goes here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Icons Tab */}
      {activeTab === 'icons' && (
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-brand" />
            <h2>Icon System</h2>
          </div>
          <p className="text-gray-600">
            We use Lucide React icons throughout the application for a consistent, clean visual language.
          </p>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {icons.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                    <Icon className="w-6 h-6 text-brand" />
                    <code className="text-sm">{item.name}</code>
                    <p className="text-xs text-gray-600 text-center">{item.usage}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="mb-4">Usage Guidelines</h3>
            <div className="space-y-3 text-sm">
              <p>
                <strong>Import:</strong>
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                  import {`{ IconName }`} from "lucide-react"
                </code>
              </p>
              <p>
                <strong>Sizing:</strong> Use Tailwind width/height classes:
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">className="w-4 h-4"</code>
              </p>
              <p>
                <strong>Coloring:</strong> Use text color classes for icon colors:
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">className="text-brand"</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




