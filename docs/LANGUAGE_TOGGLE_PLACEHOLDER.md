# Language Toggle Feature (Placeholder)

## Overview
Added language toggle buttons to the dashboard navigation for switching between English, Chinese, and Bilingual modes.

## Current Status
⚠️ **Placeholder Implementation** - UI is functional but language switching logic is not yet implemented.

## Features

### UI Components
Three toggle buttons in the top navigation bar:
1. **EN** - English mode
2. **中文** - Chinese mode  
3. **Both** (with Languages icon) - Bilingual mode

### Behavior
- Toggle buttons are styled with active/inactive states
- Active language has white background with shadow
- Toast notification confirms language selection
- Default language: English (EN)

## Location
`frontend/src/components/layouts/DashboardLayout.tsx`

## Implementation Details

### State Management
```typescript
const [currentLanguage, setCurrentLanguage] = useState<'EN' | 'CN' | 'BOTH'>('EN');
```

### Handler Function
```typescript
const handleLanguageChange = (lang: 'EN' | 'CN' | 'BOTH') => {
  setCurrentLanguage(lang);
  toast.success(`Language switched to ${lang === 'EN' ? 'English' : lang === 'CN' ? '中文' : 'Bilingual'}`);
  // TODO: Implement actual language switching logic
};
```

## TODO: Full Implementation

To complete the language switching feature, implement:

1. **Context/Store for Language State**
   - Create `LanguageContext` to manage app-wide language state
   - Persist selection to localStorage or user preferences

2. **Translation System**
   - Set up i18n library (e.g., `react-i18next`)
   - Create translation files:
     - `en.json` - English translations
     - `zh.json` - Chinese translations
   - Add translation keys throughout the app

3. **Bilingual Mode**
   - Display both English and Chinese text simultaneously
   - Format: "English / 中文" or stacked layout

4. **Database Integration**
   - Store user language preference in database
   - Load preference on login
   - Update when user changes language

5. **Template Support**
   - Update message templates to support multiple languages
   - Allow bilingual email/SMS notifications

## UI Design

```
┌────────────────────────────────────────────────────────┐
│  Mei Way Mail Plus                    [EN] [中文] [Both] │
│                                       user@email.com    │
│  Dashboard  Mail  Customers  Templates                 │
└────────────────────────────────────────────────────────┘
```

### Active State Example
- **EN selected**: `[EN]` has white background, others are gray
- **中文 selected**: `[中文]` has white background, others are gray
- **Both selected**: `[Both]` with icon has white background, others are gray

## Testing Checklist
- [x] Toggle buttons render correctly
- [x] Click each button shows toast notification
- [x] Active state highlights correctly
- [x] Build passes without errors
- [ ] Actual language content changes (pending full implementation)
- [ ] Bilingual mode displays both languages (pending)
- [ ] Language preference persists across sessions (pending)

## Dependencies
- `lucide-react` - Languages icon
- `react-hot-toast` - Toast notifications

## Date
November 23, 2025

## Future Enhancements
- Add keyboard shortcuts (e.g., Alt+E for English, Alt+C for Chinese)
- Add language indicator to templates
- Support additional languages (Spanish, etc.)
- Automatic language detection based on user's browser settings

