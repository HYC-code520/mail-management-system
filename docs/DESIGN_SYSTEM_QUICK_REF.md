# 🎨 Design System - Visual Quick Reference

## Color Palette

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKGROUNDS                              │
├─────────────────────────────────────────────────────────────┤
│ bg-black          ███████  Main app background             │
│ bg-zinc-800       ███████  Page content area               │
│ bg-zinc-900       ███████  Cards, panels, modals           │
│ bg-zinc-700       ███████  Hover states, disabled          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BORDERS                                │
├─────────────────────────────────────────────────────────────┤
│ border-zinc-700   ─────────  Default borders (cards, tables)│
│ border-zinc-600   ─────────  Subtle borders                │
│ border-zinc-500   ─────────  Input borders                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       TEXT                                  │
├─────────────────────────────────────────────────────────────┤
│ text-white        Primary headings & important text        │
│ text-zinc-300     Secondary body text                      │
│ text-zinc-400     Tertiary/muted text                      │
│ text-zinc-500     Disabled/placeholder text                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   STATUS COLORS                             │
├─────────────────────────────────────────────────────────────┤
│ 🟢 Green    Active, Success      green-400, green-500/20   │
│ 🟡 Yellow   Pending, Warning     yellow-400, yellow-500/20 │
│ 🔴 Red      Error, Inactive      red-400, red-500/20       │
│ 🔵 Blue     Info, Notified       blue-400, blue-500/20     │
│ 🩷 Pink     Focus, Accent        pink-500                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Typography Scale

```
┌─────────────────────────────────────────────────────────────┐
│  Hero Title          text-5xl font-bold text-white         │
│  Page Title          text-3xl font-bold text-white         │
│  Section Title       text-xl font-bold text-white          │
│  Body Text           text-base text-zinc-300               │
│  Secondary Text      text-sm text-zinc-400                 │
│  Caption/Meta        text-xs text-zinc-500                 │
│  Table Header        text-xs font-medium uppercase         │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Anatomy

### Button

```
┌─────────────────────────────────────┐
│         Primary Action              │  ← variant="flat"
└─────────────────────────────────────┘
  White bg, black text, bold
  py-4 px-10, hover:inverts

┌───────────────────┐
│  Secondary Action │                    ← variant="slim"
└───────────────────┘
  Same style, py-2 (compact)
```

### Card/Panel

```
┌─────────────────────────────────────┐
│ Card Title              [Action]    │
│ Optional description                │
│─────────────────────────────────────│
│                                     │
│  Content area                       │
│                                     │
│─────────────────────────────────────│
│ Footer (optional)                   │
└─────────────────────────────────────┘
  bg-zinc-900, border-zinc-700
  p-6, rounded-lg
```

### Status Badge

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ 🟢 Active │  │ 🟡 PENDING│  │ 🔴 No    │
└──────────┘  └──────────┘  └──────────┘
   Green          Yellow         Red
   /20 bg         /20 bg         /20 bg
   /30 border     /30 border     /30 border
```

### Table

```
┌────────────────────────────────────────────────────────┐
│ HEADER      │ HEADER      │ HEADER      │ ACTIONS    │  ← bg-zinc-800
├────────────────────────────────────────────────────────┤
│ Data        │ Data        │ 🟢 Active   │ [View][Edit]│  ← hover:bg-zinc-800
│ Data        │ Data        │ 🟡 PENDING  │ [View][Edit]│
└────────────────────────────────────────────────────────┘
  bg-zinc-900, divide-zinc-700
```

---

## Layout Patterns

### Page Structure

```
max-w-6xl mx-auto px-6 py-8
┌────────────────────────────────────────────────────────┐
│  Page Title                        [Action Button]     │  mb-8
├────────────────────────────────────────────────────────┤
│  ┌───────┐  ┌───────┐  ┌───────┐                     │
│  │ Stat  │  │ Stat  │  │ Stat  │                     │  grid gap-6, mb-8
│  └───────┘  └───────┘  └───────┘                     │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐ │
│  │ Main Content Panel                               │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Modal

```
       ┌─────────────────────────────┐
       │ Modal Title             [X] │  ← text-2xl, flex justify-between
       ├─────────────────────────────┤
       │                             │
       │  Content area               │
       │                             │
       │                             │
       │ [Cancel]        [Confirm]   │  ← flex gap-4
       └─────────────────────────────┘
         max-w-md, bg-zinc-900
         Fixed overlay: z-50, bg-black/50
```

---

## Spacing Reference

```
┌─────────────────────────────────────┐
│  Container: px-6 py-8               │  ← Page level
│  ┌─────────────────────────────┐   │
│  │  Panel: p-6                 │   │  ← Card/panel
│  │  ┌───────────────────────┐  │   │
│  │  │  gap-6                │  │   │  ← Grid items
│  │  │  ┌─────┐  ┌─────┐    │  │   │
│  │  │  │ mb-8│  │ mb-4│    │  │   │  ← Vertical spacing
│  │  │  └─────┘  └─────┘    │  │   │
│  │  └───────────────────────┘  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

mb-8    Major sections
mb-6    Subsections
mb-4    Between elements
mb-2    Small elements
gap-6   Grid cards
gap-4   Flex buttons
```

---

## State Indicators

```
Default:     border-zinc-700
Hover:       hover:bg-zinc-800 transition-colors
Focus:       ring-2 ring-pink-500 (automatic)
Active:      bg-zinc-700
Disabled:    opacity-50 cursor-not-allowed
Loading:     animate-pulse or LoadingDots component
```

---

## Responsive Breakpoints

```
Mobile First Approach:

<default>                 // Mobile (< 768px)
md:                       // Tablet (≥ 768px)
lg:                       // Desktop (≥ 1024px)
xl:                       // Large (≥ 1280px)

Example:
grid-cols-1               // 1 column mobile
md:grid-cols-3            // 3 columns tablet+
```

---

## Copy-Paste Templates

### Stat Card
```tsx
<div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-zinc-400 text-sm mb-1">Label</p>
      <p className="text-4xl font-bold text-white">20</p>
    </div>
    <div className="text-4xl">📊</div>
  </div>
</div>
```

### Status Badge
```tsx
<span className="px-2 py-1 rounded text-xs border bg-green-500/20 text-green-400 border-green-500/30">
  Active
</span>
```

### Panel Header
```tsx
<div className="flex justify-between items-center mb-8">
  <h1 className="text-3xl font-bold text-white">Title</h1>
  <Button variant="slim">Action</Button>
</div>
```

### Search + Filter
```tsx
<div className="flex gap-4 mb-6">
  <input
    type="text"
    placeholder="Search..."
    className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
  />
  <select className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-zinc-500">
    <option>All</option>
  </select>
</div>
```

### List Item
```tsx
<div className="flex justify-between items-center p-4 border-b border-zinc-700 last:border-b-0 hover:bg-zinc-800 rounded transition-colors">
  <div>
    <p className="font-medium text-white">Item Name</p>
    <p className="text-sm text-zinc-400">Description</p>
  </div>
  <Button variant="slim">Action</Button>
</div>
```

### Empty State
```tsx
<div className="text-center py-12">
  <div className="text-6xl mb-4">📭</div>
  <h3 className="text-xl font-semibold text-white mb-2">No items</h3>
  <p className="text-zinc-400 mb-6">Get started by creating one</p>
  <Button variant="slim">Create</Button>
</div>
```

### Alert Banner
```tsx
<div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
  <h3 className="text-green-400 font-bold mb-2">✓ Success!</h3>
  <p className="text-zinc-300">Message here</p>
</div>
```

---

## DO's and DON'Ts

### ✅ DO

- Use `bg-zinc-900` for cards/panels
- Use `border-zinc-700` for borders
- Use `text-white` for headings
- Use `text-zinc-300` for body text
- Add `hover:bg-zinc-800` to interactive elements
- Use `transition-colors` for smooth animations
- Use opacity variants (`/20`, `/30`) for status colors
- Keep padding consistent (`p-6` for panels)

### ❌ DON'T

- Don't use pure white backgrounds
- Don't use colors darker than `zinc-900`
- Don't use borders darker than `zinc-700`
- Don't forget hover states on clickable elements
- Don't mix px/py values inconsistently
- Don't use full opacity for status backgrounds
- Don't skip responsive classes (`md:`, `lg:`)
- Don't forget to add `text-white` on headings

---

## Common Mistakes

1. **Too dark** - Using `bg-zinc-950` or darker
   - ✅ Use: `bg-zinc-900` max
   
2. **No hover state** - Buttons/links without hover
   - ✅ Add: `hover:bg-zinc-800 transition-colors`

3. **Harsh status colors** - Full opacity backgrounds
   - ✅ Use: `bg-green-500/20` not `bg-green-500`

4. **Inconsistent spacing** - Random padding values
   - ✅ Stick to: `p-6`, `py-4`, `px-6`, etc.

5. **No responsive** - Same layout on mobile
   - ✅ Add: `grid-cols-1 md:grid-cols-3`

---

**Print this page and keep it handy while coding!** 📌

