# Customer Avatar Images

This folder contains custom avatar images for customers.

## Current Setup ✨

You have 10 avatar images: `1.png` through `10.png`

**Automatic Random Assignment:** Every customer automatically gets assigned one of these avatars!
- The assignment is **consistent** - same customer always gets the same avatar
- Based on a hash of their contact ID/name
- No manual mapping needed!

## How It Works

The system automatically assigns avatars using a consistent hash function:
1. Takes the customer's contact ID (or name if no ID)
2. Generates a hash from it
3. Maps to one of the 10 avatars
4. **Same input = same avatar** (stays consistent across page loads)

## Override Specific Customers (Optional)

Want to manually assign specific avatars? Edit `/frontend/src/utils/customerAvatars.ts`:

```typescript
export const customerAvatarMap: AvatarMapping = {
  // Manual overrides (optional)
  '101': '5.png',           // Mailbox 101 always gets avatar 5
  'John Doe': '3.png',      // John always gets avatar 3
  'Acme Corp': '7.png',     // Acme always gets avatar 7
};
```

Manual mappings take priority over random assignment.

## Adding More Avatars

1. Add new image files to this folder (`.jpg`, `.png`, `.gif`, `.webp`)
2. Update `AVAILABLE_AVATARS` array in `/frontend/src/utils/customerAvatars.ts`
3. The system will automatically distribute them!

## Fallback Behavior

If an avatar image fails to load, the system shows a colored circle with the customer's initials instead.

