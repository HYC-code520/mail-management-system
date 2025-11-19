# Project Structure

This document describes the organization of the Mail Management System project.

## Root Directory Structure

```
mail-management-system/
├── app/                    # Next.js app directory (pages, routes, layouts)
├── components/             # React components
├── docs/                   # Project documentation
├── fixtures/               # Test fixtures and mock data
├── public/                 # Static assets (images, icons, etc.)
├── scripts/                # Database scripts and utilities
├── styles/                 # Global styles and CSS
├── supabase/              # Supabase configuration and migrations
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions and helpers
└── [config files]         # Root-level configuration files
```

## Directory Details

### `/docs` - Documentation
Contains all project documentation files:
- `ARCHITECTURE.md` - System architecture documentation
- `COMPONENT_TEMPLATES.md` - Component templates and patterns
- `DESIGN_SYSTEM.md` - Design system guidelines
- `DESIGN_SYSTEM_QUICK_REF.md` - Quick reference for design system
- `IMPLEMENTATION_PLAN.md` - Implementation roadmap
- `SETUP_ENV.md` - Environment setup instructions

### `/scripts` - Database & Utility Scripts
Contains SQL scripts and database utilities:
- `fix_user_data.sql` - User data fix script
- `sample_data.sql` - Sample data for development
- `simple_reset_rebuild.sql` - Database reset script
- `test_data.sql` - Test data script

### `/types` - Type Definitions
Contains TypeScript type definitions:
- `types_db.ts` - Database type definitions (generated from Supabase)
- `mei-way.ts` - Custom type definitions

### Root-Level Files
Only configuration files and the main README remain at root:
- `README.md` - Main project documentation
- `package.json` - Node.js dependencies
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `next-env.d.ts` - Next.js type definitions
- `middleware.ts` - Next.js middleware
- Other config files (postcss, components.json, etc.)

## Best Practices

This structure follows Next.js and modern web development best practices:
1. **Clear separation of concerns** - Each directory has a specific purpose
2. **Documentation centralization** - All docs in one place
3. **Clean root directory** - Only config files at root level
4. **Type safety** - All type definitions in dedicated folder
5. **Organized utilities** - Scripts and utilities properly categorized
