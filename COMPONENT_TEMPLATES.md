# 📦 Reusable Component Templates

> Copy-paste these components for consistent styling across the app

---

## 1. StatusBadge Component

**File:** `components/ui/StatusBadge.tsx`

```tsx
interface StatusBadgeProps {
  status: 'Active' | 'PENDING' | 'No' | 'Received' | 'Notified' | 'Picked Up' | 'Returned';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    Active: 'bg-green-500/20 text-green-400 border-green-500/30',
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    No: 'bg-red-500/20 text-red-400 border-red-500/30',
    Received: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Notified: 'bg-green-500/20 text-green-400 border-green-500/30',
    'Picked Up': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    Returned: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs border ${colors[status]}`}>
      {status}
    </span>
  );
}

// Usage:
// <StatusBadge status="Active" />
```

---

## 2. StatCard Component

**File:** `components/ui/StatCard.tsx`

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  emoji?: string;
}

export default function StatCard({ label, value, emoji }: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-sm mb-1">{label}</p>
          <p className="text-4xl font-bold text-white">{value}</p>
        </div>
        {emoji && <div className="text-4xl">{emoji}</div>}
      </div>
    </div>
  );
}

// Usage:
// <StatCard label="Total Contacts" value={20} emoji="📇" />
```

---

## 3. PageHeader Component

**File:** `components/ui/PageHeader.tsx`

```tsx
import { ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface PageHeaderProps {
  title: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-white">{title}</h1>
      {action && (
        <Button variant="slim" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Usage:
// <PageHeader 
//   title="Dashboard" 
//   action={{ label: "+ Add Contact", onClick: () => setShowModal(true) }}
// />
```

---

## 4. Panel Component

**File:** `components/ui/Panel.tsx`

```tsx
import { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <div className={`bg-zinc-900 border border-zinc-700 rounded-lg p-6 ${className}`}>
      {title && <h2 className="text-xl font-bold text-white mb-4">{title}</h2>}
      {children}
    </div>
  );
}

// Usage:
// <Panel title="Recent Activity">
//   <p>Content here</p>
// </Panel>
```

---

## 5. Modal Component

**File:** `components/ui/Modal.tsx`

```tsx
'use client';

import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = 'md'
}: ModalProps) {
  if (!isOpen) return null;

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className={`bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full ${widths[maxWidth]} mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Usage:
// <Modal 
//   isOpen={showModal} 
//   onClose={() => setShowModal(false)}
//   title="Add Contact"
// >
//   <form>...</form>
// </Modal>
```

---

## 6. SearchBar Component

**File:** `components/ui/SearchBar.tsx`

```tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search...' 
}: SearchBarProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
    />
  );
}

// Usage:
// <SearchBar 
//   value={searchTerm} 
//   onChange={setSearchTerm}
//   placeholder="Search contacts..."
// />
```

---

## 7. AlertBanner Component

**File:** `components/ui/AlertBanner.tsx`

```tsx
import { ReactNode } from 'react';

interface AlertBannerProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  title: string;
  children: ReactNode;
}

export default function AlertBanner({ variant, title, children }: AlertBannerProps) {
  const styles = {
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      title: 'text-green-400',
      icon: '✓'
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      title: 'text-yellow-400',
      icon: '⚠️'
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      title: 'text-red-400',
      icon: '✕'
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      title: 'text-blue-400',
      icon: 'ℹ'
    }
  };

  const style = styles[variant];

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-6`}>
      <h3 className={`${style.title} font-bold mb-2`}>
        {style.icon} {title}
      </h3>
      <div className="text-zinc-300">{children}</div>
    </div>
  );
}

// Usage:
// <AlertBanner variant="success" title="Success!">
//   <p>Your changes have been saved.</p>
// </AlertBanner>
```

---

## 8. EmptyState Component

**File:** `components/ui/EmptyState.tsx`

```tsx
import Button from '@/components/ui/Button';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{emoji}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 mb-6">{description}</p>
      {action && (
        <Button variant="slim" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Usage:
// <EmptyState
//   emoji="📭"
//   title="No mail items yet"
//   description="Get started by logging your first package"
//   action={{ label: "+ Add Mail Item", onClick: () => setShowModal(true) }}
// />
```

---

## 9. LoadingSkeleton Component

**File:** `components/ui/LoadingSkeleton.tsx`

```tsx
interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export default function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-zinc-700 rounded animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

// Usage:
// {loading ? <LoadingSkeleton lines={5} /> : <ContentComponent />}
```

---

## 10. FormField Component

**File:** `components/ui/FormField.tsx`

```tsx
import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export default function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

// Usage:
// <FormField label="Email" required error={errors.email}>
//   <Input type="email" value={email} onChange={setEmail} />
// </FormField>
```

---

## 11. Select Component

**File:** `components/ui/Select.tsx`

```tsx
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export default function Select({ value, onChange, options, placeholder }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Usage:
// <Select
//   value={status}
//   onChange={setStatus}
//   options={[
//     { value: 'active', label: 'Active' },
//     { value: 'pending', label: 'Pending' }
//   ]}
//   placeholder="Select status..."
// />
```

---

## 12. Tabs Component

**File:** `components/ui/Tabs.tsx`

```tsx
'use client';

import { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div>
      <div className="flex border-b border-zinc-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-pink-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

// Usage:
// <Tabs
//   tabs={[
//     { id: 'overview', label: 'Overview', content: <OverviewTab /> },
//     { id: 'settings', label: 'Settings', content: <SettingsTab /> }
//   ]}
// />
```

---

## Usage Example: Building a Page with These Components

```tsx
'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Panel from '@/components/ui/Panel';
import StatusBadge from '@/components/ui/StatusBadge';
import SearchBar from '@/components/ui/SearchBar';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';

export default function DashboardPage() {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <PageHeader 
        title="Dashboard"
        action={{ label: "+ Add Item", onClick: () => setShowModal(true) }}
      />

      <AlertBanner variant="success" title="Welcome back!">
        <p>You have 5 new notifications</p>
      </AlertBanner>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
        <StatCard label="Total Items" value={42} emoji="📦" />
        <StatCard label="Active" value={38} emoji="✓" />
        <StatCard label="Pending" value={4} emoji="⏰" />
      </div>

      <Panel title="Recent Activity">
        <div className="mb-4">
          <SearchBar 
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search activity..."
          />
        </div>

        {/* Show content or empty state */}
        {searchTerm === '' ? (
          <EmptyState
            emoji="📭"
            title="No activity yet"
            description="Get started by creating your first item"
            action={{ label: "+ Add Item", onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center p-4 hover:bg-zinc-800 rounded">
              <span className="text-white">Item 1</span>
              <StatusBadge status="Active" />
            </div>
          </div>
        )}
      </Panel>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Item"
      >
        <form className="space-y-4">
          {/* Form fields here */}
          <div className="flex gap-4 mt-6">
            <Button variant="slim" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="flat" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

---

## Next Steps

1. **Create these component files** in `components/ui/`
2. **Import and use** in your pages
3. **Customize** as needed while following the design system
4. **Test** components work together seamlessly

All components follow the design system colors, spacing, and interaction patterns!

