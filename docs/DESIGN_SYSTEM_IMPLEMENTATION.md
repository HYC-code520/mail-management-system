# Design System Implementation Guide

## Color System Updates

### Brand Colors (Green Palette)
- Primary: `#15803d` (green-700) - Use for headings, primary actions
- Hover: `#16a34a` (green-600) - Use for hover states  
- Accent: `#22c55e` (green-500) - Use for highlights
- Light: `#dcfce7` (green-100) - Use for light backgrounds

### Status Badge Colors
Based on the design system, update status badges:

**Current (Black/Gray):**
- Pending: `bg-black text-white`
- Notified: `bg-gray-200 text-gray-700`
- Picked Up: `bg-gray-200 text-gray-700`

**New (Semantic):**
- Pending: `bg-gray-900 text-white` (Dark neutral - awaiting action)
- Notified: `bg-brand-100 text-brand-700` (Green - positive action taken)
- Picked Up: `bg-gray-200 text-gray-700` (Gray - completed/neutral)
- Active: `bg-brand-700 text-white` (Green - currently active)

### Button Updates
Replace all black buttons with brand-based buttons:

**Current:** `bg-black hover:bg-gray-800`
**New:** `bg-brand-700 hover:bg-brand-600`

### Input Focus States
**Current:** `focus:ring-2 focus:ring-green-500`
**New:** `focus:ring-2 focus:ring-brand-700`

## Typography

All typography is now defined in `globals.css`:
- h1: 1.5rem (24px), weight 500
- h2: 1.25rem (20px), weight 500  
- h3: 1.125rem (18px), weight 500
- h4/p: 1rem (16px), weight 400/500

## Spacing

Standard spacing scale:
- 0.25rem (4px) - Minimal gaps
- 0.5rem (8px) - Tight spacing
- 1rem (16px) - Default spacing
- 1.5rem (24px) - Medium spacing
- 2rem (32px) - Large spacing
- 3rem (48px) - Extra large spacing

## Border Radius

- `rounded-sm`: 0.225rem
- `rounded-md`: 0.425rem (default for most components)
- `rounded-lg`: 0.625rem (cards, larger elements)
- `rounded-xl`: 1.025rem (special emphasis)

## Component Updates Needed

### 1. Dashboard
- Update stat card numbers to use `text-brand-700`
- Update "Add" buttons to `bg-brand-700 hover:bg-brand-600`

### 2. Intake Page
- Update "Save Mail Entry" button
- Update focus rings on inputs

### 3. Customers Page  
- Update "Add New Customer" button
- Update "View", "Message", "Edit" links to `text-brand-700 hover:text-brand-600`
- Update Active status badges

### 4. Customer Detail
- Update badges
- Update action buttons

### 5. Templates Page
- Update "Edit" and "New Template" buttons
- Update "Copy" button success states

### 6. Log Page
- Update filter focus rings
- Update status badges

### 7. Modal Component
- No changes needed (uses semantic gray)

## Icons

Continue using Lucide React icons with:
- Size: `w-4 h-4` or `w-5 h-5`
- Color: `text-brand-700` for primary icons, `text-gray-600` for secondary

## Implementation Priority

1. ✅ Updated Tailwind config with brand colors
2. ✅ Updated global CSS with typography
3. ✅ Updated logo color in navigation
4. 🔄 Update all buttons (in progress)
5. 🔄 Update all status badges
6. 🔄 Update all form inputs
7. 🔄 Update action links

## Notes

- Keep accessibility in mind - maintain sufficient contrast ratios
- Test in both light backgrounds and white cards
- The muted green (#15803d) provides professional, calm aesthetic
- Gray remains for neutral/completed states
- Green indicates active/positive states


