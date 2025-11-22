# Icon Replacement Guide

## Lucide React Icons Used

### Core Icons
- **Mail** - Letter/email items
- **Package** - Package items  
- **Bell** - Notifications
- **Clock** - Pending status
- **User** - Customers/contacts
- **FileText** - Templates, logs
- **Search** - Search functionality
- **Plus** - Add new items
- **ChevronRight** - Navigation arrows
- **Eye** - View details
- **Calendar** - Date selection
- **Settings** - Configuration

### Emoji → Icon Replacements

**Dashboard:**
- 📬 → `<Mail className="w-8 h-8" />`
- 📦 → `<Package className="w-8 h-8" />`
- 🔔 → `<Bell className="w-8 h-8" />`
- 🔍 → `<Search className="w-4 h-4" />`

**Intake:**
- 🔍 → `<Search className="w-4 h-4" />`
- 💾 → Keep or replace with `<Save className="w-4 h-4" />`
- 🔔 → `<Bell className="w-4 h-4" />`

**Customers:**
- 👥 → `<Users className="w-16 h-16" />`
- ✉️ → `<Mail className="w-4 h-4" />`
- 📱 → `<Phone className="w-4 h-4" />`
- 📮 → `<Mailbox className="w-4 h-4" />` or `<Mail className="w-4 h-4" />`
- 🏢 → `<Building className="w-4 h-4" />`

**Customer Detail:**
- ✉️ → `<Mail className="w-5 h-5" />`
- 📞 → `<Phone className="w-5 h-5" />`
- 📭 → `<Mail className="w-16 h-16" />`

**Templates:**
- 📝 → `<FileText className="w-16 h-16" />`
- 📋 → `<Copy className="w-4 h-4" />`

**Log:**
- 📭 → `<Mail className="w-16 h-16" />`
- 📦 → `<Package className="w-4 h-4" />`
- ✉️ → `<Mail className="w-4 h-4" />`
- ▶ → `<ChevronRight className="w-4 h-4" />`

## Installation
```bash
npm install lucide-react
```

## Usage
```tsx
import { Mail, Package, Bell, Search } from 'lucide-react';

<Mail className="w-4 h-4 text-brand" />
```

## Sizing
- Small (inline): `w-4 h-4`
- Medium (cards): `w-5 h-5` or `w-6 h-6`
- Large (stat cards): `w-8 h-8`
- Extra large (empty states): `w-16 h-16`

## Coloring
- Primary: `text-brand` (#15803d)
- Secondary: `text-gray-600`
- Muted: `text-gray-400`


