'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

export default function DesignSystemPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-white mb-4">🎨 Design System</h1>
        <p className="text-xl text-zinc-400">
          Visual reference for all UI components and styles
        </p>
      </div>

      {/* Color System */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Color Palette</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Backgrounds */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Backgrounds</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-black border border-zinc-700 rounded"></div>
                <div>
                  <p className="text-white font-mono text-sm">bg-black</p>
                  <p className="text-zinc-400 text-xs">Main app background</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-zinc-800 border border-zinc-700 rounded"></div>
                <div>
                  <p className="text-white font-mono text-sm">bg-zinc-800</p>
                  <p className="text-zinc-400 text-xs">Page content area</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-zinc-900 border border-zinc-700 rounded"></div>
                <div>
                  <p className="text-white font-mono text-sm">bg-zinc-900</p>
                  <p className="text-zinc-400 text-xs">Cards & panels</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-zinc-700 border border-zinc-600 rounded"></div>
                <div>
                  <p className="text-white font-mono text-sm">bg-zinc-700</p>
                  <p className="text-zinc-400 text-xs">Hover states</p>
                </div>
              </div>
            </div>
          </div>

          {/* Text Colors */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Text Colors</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center">
                  <span className="text-white font-bold">Aa</span>
                </div>
                <div>
                  <p className="text-white font-mono text-sm">text-white</p>
                  <p className="text-zinc-400 text-xs">Primary text</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center">
                  <span className="text-zinc-300">Aa</span>
                </div>
                <div>
                  <p className="text-white font-mono text-sm">text-zinc-300</p>
                  <p className="text-zinc-400 text-xs">Secondary text</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center">
                  <span className="text-zinc-400">Aa</span>
                </div>
                <div>
                  <p className="text-white font-mono text-sm">text-zinc-400</p>
                  <p className="text-zinc-400 text-xs">Tertiary text</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-12 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center">
                  <span className="text-zinc-500">Aa</span>
                </div>
                <div>
                  <p className="text-white font-mono text-sm">text-zinc-500</p>
                  <p className="text-zinc-400 text-xs">Disabled/placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Colors */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-white mb-4">Status Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="w-full h-8 bg-green-500/20 rounded mb-2"></div>
              <p className="text-green-400 font-semibold">Success / Active</p>
              <p className="text-xs text-zinc-400 mt-1">green-500/20</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="w-full h-8 bg-yellow-500/20 rounded mb-2"></div>
              <p className="text-yellow-400 font-semibold">Warning / Pending</p>
              <p className="text-xs text-zinc-400 mt-1">yellow-500/20</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="w-full h-8 bg-red-500/20 rounded mb-2"></div>
              <p className="text-red-400 font-semibold">Error / Inactive</p>
              <p className="text-xs text-zinc-400 mt-1">red-500/20</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="w-full h-8 bg-blue-500/20 rounded mb-2"></div>
              <p className="text-blue-400 font-semibold">Info / Notified</p>
              <p className="text-xs text-zinc-400 mt-1">blue-500/20</p>
            </div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Typography</h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
          <div>
            <h1 className="text-5xl font-bold text-white">Hero Title - 5xl</h1>
            <code className="text-xs text-zinc-500">text-5xl font-bold text-white</code>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Page Title - 3xl</h1>
            <code className="text-xs text-zinc-500">text-3xl font-bold text-white</code>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Section Title - 2xl</h2>
            <code className="text-xs text-zinc-500">text-2xl font-bold text-white</code>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Card Title - xl</h2>
            <code className="text-xs text-zinc-500">text-xl font-bold text-white</code>
          </div>
          <div>
            <p className="text-base text-zinc-300">Body text - base (16px)</p>
            <code className="text-xs text-zinc-500">text-base text-zinc-300</code>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Secondary text - sm (14px)</p>
            <code className="text-xs text-zinc-500">text-sm text-zinc-400</code>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Caption text - xs (12px)</p>
            <code className="text-xs text-zinc-500">text-xs text-zinc-500</code>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Buttons</h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Flat Variant (Primary)</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="flat">Primary Action</Button>
                <Button variant="flat" loading={true}>Loading...</Button>
                <Button variant="flat" disabled={true}>Disabled</Button>
              </div>
              <code className="text-xs text-zinc-500 mt-2 block">
                {`<Button variant="flat">Primary Action</Button>`}
              </code>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Slim Variant (Secondary)</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="slim">Secondary Action</Button>
                <Button variant="slim" loading={true}>Loading...</Button>
                <Button variant="slim" disabled={true}>Disabled</Button>
              </div>
              <code className="text-xs text-zinc-500 mt-2 block">
                {`<Button variant="slim">Secondary Action</Button>`}
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Status Badges */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Status Badges</h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <span className="px-2 py-1 rounded text-xs border bg-green-500/20 text-green-400 border-green-500/30">
              Active
            </span>
            <span className="px-2 py-1 rounded text-xs border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              PENDING
            </span>
            <span className="px-2 py-1 rounded text-xs border bg-red-500/20 text-red-400 border-red-500/30">
              No
            </span>
            <span className="px-2 py-1 rounded text-xs border bg-blue-500/20 text-blue-400 border-blue-500/30">
              Notified
            </span>
            <span className="px-2 py-1 rounded text-xs border bg-gray-500/20 text-gray-400 border-gray-500/30">
              Picked Up
            </span>
          </div>
          <code className="text-xs text-zinc-500">
            {`<span className="px-2 py-1 rounded text-xs border bg-green-500/20 text-green-400 border-green-500/30">Active</span>`}
          </code>
        </div>
      </section>

      {/* Inputs */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Form Inputs</h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <div className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Text Input
              </label>
              <Input type="text" placeholder="Enter text..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Search Input
              </label>
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Select Dropdown
              </label>
              <select className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Textarea
              </label>
              <textarea
                rows={3}
                placeholder="Enter description..."
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Cards & Panels */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Cards & Panels</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Stat Card */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Stat Label</p>
                <p className="text-4xl font-bold text-white">42</p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Total Items</p>
                <p className="text-4xl font-bold text-white">128</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Active Users</p>
                <p className="text-4xl font-bold text-white">24</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>
        </div>

        {/* Content Panel */}
        <Card title="Content Card" description="With header and optional footer">
          <p className="text-zinc-300 mt-4">
            This is the Card component from the UI library. It includes a title, optional description, 
            content area, and optional footer.
          </p>
        </Card>
      </section>

      {/* Alert Banners */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Alert Banners</h2>
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-green-400 font-bold mb-2">✓ Success!</h3>
            <p className="text-zinc-300">Your changes have been saved successfully.</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
            <h3 className="text-yellow-400 font-bold mb-2">⚠️ Warning</h3>
            <p className="text-zinc-300">Please review the information before continuing.</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <h3 className="text-red-400 font-bold mb-2">✕ Error</h3>
            <p className="text-zinc-300">Something went wrong. Please try again.</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-blue-400 font-bold mb-2">ℹ Info</h3>
            <p className="text-zinc-300">Here's some helpful information for you.</p>
          </div>
        </div>
      </section>

      {/* Tables */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Tables</h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-zinc-700">
            <thead className="bg-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              <tr className="hover:bg-zinc-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  Item 1
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 rounded text-xs border bg-green-500/20 text-green-400 border-green-500/30">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                  Nov 8, 2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button className="text-blue-400 hover:text-blue-300">View</button>
                  <button className="text-green-400 hover:text-green-300">Edit</button>
                </td>
              </tr>
              <tr className="hover:bg-zinc-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  Item 2
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 rounded text-xs border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    PENDING
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                  Nov 7, 2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button className="text-blue-400 hover:text-blue-300">View</button>
                  <button className="text-green-400 hover:text-green-300">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Example */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Modal</h2>
        <Button variant="slim" onClick={() => setShowModal(true)}>
          Show Modal Example
        </Button>

        {showModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <div 
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Modal Title</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-zinc-400 hover:text-white text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
              <p className="text-zinc-300 mb-6">
                This is a modal dialog. Click the X or outside to close.
              </p>
              <div className="flex gap-4">
                <Button variant="slim" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="flat" onClick={() => setShowModal(false)}>
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Empty State */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Empty State</h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">No items yet</h3>
            <p className="text-zinc-400 mb-6">
              Get started by creating your first item
            </p>
            <Button variant="slim">Create Item</Button>
          </div>
        </div>
      </section>

      {/* Spacing Guide */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Spacing Scale</h2>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-pink-500"></div>
            <code className="text-white">gap-2 / mb-2</code>
            <span className="text-zinc-400">- Small elements (8px)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-8 bg-pink-500"></div>
            <code className="text-white">gap-4 / mb-4</code>
            <span className="text-zinc-400">- Between elements (16px)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-8 bg-pink-500"></div>
            <code className="text-white">gap-6 / mb-6</code>
            <span className="text-zinc-400">- Subsections (24px)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-32 h-8 bg-pink-500"></div>
            <code className="text-white">gap-8 / mb-8</code>
            <span className="text-zinc-400">- Major sections (32px)</span>
          </div>
        </div>
      </section>

      {/* Documentation Link */}
      <section className="mb-12">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-blue-400 font-bold mb-2">📚 Full Documentation</h3>
          <p className="text-zinc-300 mb-4">
            For complete guidelines, component templates, and code examples, check out:
          </p>
          <ul className="list-disc list-inside text-zinc-300 space-y-2">
            <li><code className="text-blue-400">DESIGN_SYSTEM.md</code> - Complete design system documentation</li>
            <li><code className="text-blue-400">DESIGN_SYSTEM_QUICK_REF.md</code> - Quick visual reference</li>
            <li><code className="text-blue-400">COMPONENT_TEMPLATES.md</code> - Copy-paste component templates</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

