# 🎨 Mei Way Design System
**Frontend Style Guide & Component Library**

> Based on the existing Next.js Subscription Starter codebase  
> All future frontend development should follow these standards

---

## 📋 Table of Contents
1. [Color System](#color-system)
2. [Typography](#typography)
3. [Spacing & Layout](#spacing--layout)
4. [Components](#components)
5. [States & Interactions](#states--interactions)
6. [Usage Guidelines](#usage-guidelines)

---

## 🎨 Color System

### Base Colors
Our app uses a **dark theme** with zinc/gray scale as the foundation.

```css
/* Background Colors */
--bg-primary: black            /* Main background */
--bg-secondary: #27272a        /* zinc-800 - Page content background */
--bg-tertiary: #18181b         /* zinc-900 - Card/panel backgrounds */

/* Border Colors */
--border-default: #3f3f46      /* zinc-700 - Default borders */
--border-subtle: #52525b       /* zinc-600 - Subtle borders */
--border-input: #71717a        /* zinc-500 - Input borders */

/* Text Colors */
--text-primary: #ffffff        /* white - Primary text */
--text-secondary: #d4d4d8      /* zinc-300 - Secondary text */
--text-tertiary: #a1a1aa       /* zinc-400 - Tertiary/muted text */
--text-disabled: #71717a       /* zinc-500 - Disabled text */
```

### Accent Colors

```css
/* Pink - Focus/Accent */
--accent-pink: #ec4899         /* pink-500 - Focus rings, highlights */

/* Status Colors */
--success-bg: rgba(34, 197, 94, 0.1)    /* green-500/10 */
--success-text: #4ade80                  /* green-400 */
--success-border: rgba(34, 197, 94, 0.3)

--warning-bg: rgba(234, 179, 8, 0.1)    /* yellow-500/10 */
--warning-text: #facc15                  /* yellow-400 */
--warning-border: rgba(234, 179, 8, 0.3)

--error-bg: rgba(239, 68, 68, 0.1)      /* red-500/10 */
--error-text: #f87171                    /* red-400 */
--error-border: rgba(239, 68, 68, 0.3)

--info-bg: rgba(59, 130, 246, 0.1)      /* blue-500/10 */
--info-text: #60a5fa                     /* blue-400 */
--info-border: rgba(59, 130, 246, 0.3)
```

### Tailwind Class Reference

```tsx
// Backgrounds
bg-black              // Main app background
bg-zinc-800           // Page background
bg-zinc-900           // Card/panel background
bg-zinc-700           // Hover state backgrounds

// Borders
border-zinc-700       // Default borders
border-zinc-600       // Subtle borders
border-zinc-500       // Input borders

// Text
text-white            // Primary text
text-zinc-300         // Secondary text
text-zinc-400         // Tertiary text
text-zinc-500         // Disabled/placeholder text
```

---

## ✍️ Typography

### Font Family
```css
font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Helvetica Neue', 'Helvetica', sans-serif;
```

**System font stack** for optimal performance and native feel across platforms.

### Text Sizes

```tsx
// Headings
<h1 className="text-5xl font-bold text-white">       // Page hero
<h1 className="text-3xl font-bold text-white">       // Page title
<h2 className="text-2xl font-bold text-white">       // Section title
<h2 className="text-xl font-bold text-white">        // Card title
<h3 className="text-lg font-semibold text-white">    // Subsection

// Body Text
<p className="text-base text-zinc-300">              // Standard paragraph
<p className="text-sm text-zinc-400">                // Secondary text
<span className="text-xs text-zinc-500">             // Caption/metadata

// Uppercase Labels
<th className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
```

### Font Weights

```tsx
font-bold              // 700 - Headings, emphasis
font-semibold          // 600 - Buttons, labels
font-medium            // 500 - Important text
font-normal            // 400 - Body text
```

---

## 📐 Spacing & Layout

### Container Widths

```tsx
// Page containers
<div className="max-w-6xl mx-auto px-6 py-8">     // Standard page
<div className="max-w-7xl mx-auto px-6 py-8">     // Wide page (tables)
<div className="max-w-3xl mx-auto">               // Narrow content (cards)
```

### Spacing Scale

```tsx
// Padding
px-6 py-8              // Page padding (desktop)
px-4 py-6              // Card/panel padding
px-6 py-3              // Table cell padding
px-2 py-1              // Badge/pill padding

// Margins
mb-8                   // Between major sections
mb-6                   // Between subsections
mb-4                   // Between elements
mb-2                   // Between small elements

// Gaps (Flexbox/Grid)
gap-6                  // Grid cards
gap-4                  // Flex buttons
gap-2                  // Small elements
```

### Grid Layouts

```tsx
// Dashboard stats (3 columns)
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// Feature grid (auto-fit)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

---

## 🧩 Components

### 1. Button Component

**Location:** `components/ui/Button/Button.tsx`

```tsx
import Button from '@/components/ui/Button';

// Variants
<Button variant="flat">Primary Action</Button>      // Default: White bg, bold
<Button variant="slim">Secondary Action</Button>    // Compact: Less padding

// States
<Button loading={true}>Saving...</Button>           // Shows spinner
<Button disabled={true}>Disabled</Button>           // Grayed out

// Sizes (via variant)
variant="flat"   // py-4 px-10 - Full size
variant="slim"   // py-2 px-10 - Compact
```

**Style Guide:**
- **Primary actions:** Use `variant="flat"` (bold, prominent)
- **Secondary actions:** Use `variant="slim"` (compact)
- **Destructive actions:** Add custom `className` with red colors
- **Always** include loading state for async actions

**Example:**
```tsx
<Button 
  variant="slim" 
  onClick={handleSave}
  loading={isSaving}
>
  Save Changes
</Button>
```

---

### 2. Card Component

**Location:** `components/ui/Card/Card.tsx`

```tsx
import Card from '@/components/ui/Card';

// Basic card
<Card title="Section Title" description="Optional description">
  <p>Content here</p>
</Card>

// With footer
<Card 
  title="User Settings"
  footer={<button>Save</button>}
>
  <form>...</form>
</Card>
```

**Style Guide:**
- Max width: `max-w-3xl` (auto-applied)
- Border: `border-zinc-700`
- Background: Transparent with border (zinc-700)
- Footer: `bg-zinc-900` with `border-t`

**When to use:**
- Form containers
- Content sections with headers
- Settings panels

---

### 3. Input Component

**Location:** `components/ui/Input/Input.tsx`

```tsx
import Input from '@/components/ui/Input';

<Input
  type="text"
  placeholder="Enter value..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

**Style:**
- Background: `bg-black`
- Border: `border-zinc-500`
- Text: `text-zinc-200`
- Focus: Pink ring (`ring-pink-500`)

**Variants (custom):**
```tsx
// Search input
<input
  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
  placeholder="Search..."
/>

// Select dropdown
<select className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500">
  <option>Option 1</option>
</select>
```

---

### 4. Status Badge

**Custom Component - Create as needed**

```tsx
// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const colors = {
    Active: 'bg-green-500/20 text-green-400 border-green-500/30',
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    No: 'bg-red-500/20 text-red-400 border-red-500/30',
    Notified: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs border ${colors[status]}`}>
      {status}
    </span>
  );
};

// Usage
<StatusBadge status="Active" />
```

**Style Guide:**
- Size: `text-xs`
- Padding: `px-2 py-1`
- Border radius: `rounded` (4px)
- Always include border for definition
- Use opacity variants: `/20` for bg, `/30` for border

---

### 5. Table Component

**Custom - Build with Tailwind**

```tsx
<div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-zinc-700">
      <thead className="bg-zinc-800">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Column Name
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-700">
        <tr className="hover:bg-zinc-800 transition-colors">
          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
            Data
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**Style Guide:**
- Container: `bg-zinc-900 border border-zinc-700 rounded-lg`
- Header: `bg-zinc-800` with uppercase labels
- Row hover: `hover:bg-zinc-800`
- Dividers: `divide-y divide-zinc-700`
- Cell padding: `px-6 py-4`

---

### 6. Modal/Dialog

**Custom Component - Create as needed**

```tsx
'use client';

export default function Modal({ isOpen, onClose, title, children }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

**Style Guide:**
- Overlay: `bg-black bg-opacity-50` (50% black)
- Container: `bg-zinc-900 border border-zinc-700`
- Max width: `max-w-md` (forms), `max-w-2xl` (content)
- Z-index: `z-50`
- Border radius: `rounded-lg`

---

### 7. Toast Notifications

**Location:** `components/ui/Toasts/toast.tsx`

```tsx
import { toast } from '@/components/ui/Toasts/use-toast';

// Success
toast({
  title: 'Success!',
  description: 'Contact created successfully'
});

// Error
toast({
  title: 'Error',
  description: 'Failed to save changes',
  variant: 'destructive'
});
```

**Already configured** - Use as-is.

---

## 🎭 States & Interactions

### Hover States

```tsx
// Buttons
hover:bg-zinc-800 hover:text-white

// Links
hover:text-zinc-100 hover:underline

// Table rows
hover:bg-zinc-800

// Cards/panels
hover:bg-zinc-800 transition-colors
```

### Focus States

**Global focus ring** (applied automatically via CSS):
```css
*:focus {
  outline: none;
  ring: 2px solid #ec4899;  /* pink-500 */
  ring-opacity: 0.5;
}
```

### Active/Selected States

```tsx
// Active navigation link
className="text-white border-b-2 border-pink-500"

// Selected table row
className="bg-zinc-700"
```

### Loading States

```tsx
// Button loading
<Button loading={true}>Saving...</Button>

// Skeleton (create as needed)
<div className="animate-pulse bg-zinc-700 h-4 rounded"></div>
```

### Disabled States

```tsx
// Buttons
<Button disabled={true}>Cannot Click</Button>

// Inputs
<input disabled className="opacity-50 cursor-not-allowed" />
```

### Transitions

```tsx
// Default transition
transition-colors              // For color changes

// Full transition
transition duration-150 ease-in-out

// Hover/interaction
transition ease-in-out duration-75
```

---

## 📏 Usage Guidelines

### 1. Page Structure

**Standard page layout:**
```tsx
export default function Page() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Page Title</h1>
        <Button variant="slim">Action</Button>
      </div>

      {/* Stats/metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Stat cards */}
      </div>

      {/* Main content */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
        {/* Content */}
      </div>
    </div>
  );
}
```

---

### 2. Dashboard Cards/Panels

```tsx
// Stat card
<div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-zinc-400 text-sm mb-1">Metric Label</p>
      <p className="text-4xl font-bold text-white">{value}</p>
    </div>
    <div className="text-4xl">{emoji}</div>
  </div>
</div>

// Content panel
<div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-8">
  <h2 className="text-xl font-bold text-white mb-4">Section Title</h2>
  <div className="space-y-2">
    {/* List items */}
  </div>
</div>
```

---

### 3. Forms

```tsx
<form className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-zinc-300 mb-2">
      Field Label
    </label>
    <Input
      type="text"
      placeholder="Enter value..."
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-zinc-300 mb-2">
      Dropdown
    </label>
    <select className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white">
      <option>Option 1</option>
    </select>
  </div>

  <div className="flex gap-4 mt-6">
    <Button variant="slim" type="button" onClick={onCancel}>
      Cancel
    </Button>
    <Button variant="flat" type="submit">
      Save
    </Button>
  </div>
</form>
```

---

### 4. Lists & Tables

```tsx
// Simple list
<div className="space-y-2">
  {items.map(item => (
    <div className="flex justify-between items-center p-4 border-b border-zinc-700 last:border-b-0 hover:bg-zinc-800 rounded transition-colors">
      <div>
        <p className="font-medium text-white">{item.name}</p>
        <p className="text-sm text-zinc-400">{item.description}</p>
      </div>
      <Button variant="slim">Action</Button>
    </div>
  ))}
</div>

// Data table - See "Table Component" section above
```

---

### 5. Empty States

```tsx
<div className="text-center py-12">
  <div className="text-6xl mb-4">📭</div>
  <h3 className="text-xl font-semibold text-white mb-2">
    No items yet
  </h3>
  <p className="text-zinc-400 mb-6">
    Get started by creating your first item
  </p>
  <Button variant="slim">Create Item</Button>
</div>
```

---

### 6. Alert/Banner Messages

```tsx
// Success banner
<div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-8">
  <h3 className="text-green-400 font-bold mb-2">✓ Success!</h3>
  <p className="text-zinc-300">Your changes have been saved.</p>
</div>

// Warning banner
<div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-8">
  <h3 className="text-yellow-400 font-bold mb-2">⚠️ Warning</h3>
  <p className="text-zinc-300">Please review before continuing.</p>
</div>

// Error banner
<div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-8">
  <h3 className="text-red-400 font-bold mb-2">✕ Error</h3>
  <p className="text-zinc-300">Something went wrong. Please try again.</p>
</div>
```

---

## 🚀 Quick Reference Cheat Sheet

### Common Patterns

```tsx
// Container
<div className="max-w-6xl mx-auto px-6 py-8">

// Panel/Card
<div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">

// Flex row with space between
<div className="flex justify-between items-center">

// Grid (3 columns)
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// Vertical spacing
<div className="space-y-4">

// Hover effect
<div className="hover:bg-zinc-800 transition-colors">
```

### Typography Quick Reference

```tsx
text-5xl font-bold text-white          // Hero heading
text-3xl font-bold text-white          // Page title
text-xl font-bold text-white           // Section title
text-base text-zinc-300                // Body text
text-sm text-zinc-400                  // Secondary text
text-xs text-zinc-500                  // Caption
```

### Color Quick Reference

```tsx
bg-black             border-zinc-700    text-white
bg-zinc-800          border-zinc-600    text-zinc-300
bg-zinc-900          border-zinc-500    text-zinc-400
```

---

## ✅ Design System Checklist

When building a new component/page, ensure:

- [ ] Uses dark theme colors (zinc scale)
- [ ] Text is readable (white/zinc-300 on dark backgrounds)
- [ ] Borders use `border-zinc-700` or lighter
- [ ] Hover states have `transition-colors`
- [ ] Focus states work (automatic pink ring)
- [ ] Responsive (mobile-first, uses `md:` breakpoints)
- [ ] Uses existing components (Button, Card, Input)
- [ ] Spacing is consistent (gap-6, mb-8, etc.)
- [ ] Status badges use opacity variants
- [ ] Loading states are handled

---

## 📚 Additional Resources

- **Tailwind Docs:** https://tailwindcss.com/docs
- **Existing Components:** Check `components/ui/` folder
- **Color Palette:** Zinc scale + Pink accent
- **Icons:** Use emojis or add a library (lucide-react recommended)

---

**Last Updated:** November 2025  
**Maintained By:** Frontend Team  
**Questions?** Refer to existing components in `components/ui/`

