# Cursor Usage Optimization Guide
*How to get the most out of Cursor without burning through your usage limits*

---

## 🎯 Quick Wins (Start Here!)

### 1. **Use Workspace Search FIRST** (Free!)
Before asking Cursor to find something:
```
Cmd + Shift + F (Mac) or Ctrl + Shift + F (Windows)
```
- Search for function names, variable names, error messages
- Find where something is used across the codebase
- Then ask Cursor to "update line 150 in `file.tsx`" (targeted)

### 2. **Ask Targeted Questions**
❌ **High Usage:**
> "Help me understand how the email system works"
- Cursor reads 10+ files to understand the full system

✅ **Low Usage:**
> "In `email.controller.js`, how does the `sendBulkNotification` function work?"
- Cursor only reads 1 specific file

### 3. **Use Git Diff for Recent Changes**
Instead of asking "what did we change?":
```bash
git diff main...develop
git log --oneline -10
```
Then ask specific questions about those changes.

### 4. **Break Big Tasks into Focused Sessions**
❌ **One Marathon Session (High Usage):**
- "Help me: fix tests, add features, write docs, prepare demo"
- Loads massive context repeatedly

✅ **Multiple Focused Sessions (Low Usage):**
- Session 1: "Fix failing tests in `ScanSession.test.tsx`"
- Session 2: "Add Waive Fee to three-dot menu"
- Session 3: "Help with Demo Day worksheet"

---

## 📊 Token Cost by Tool Type

### Very Expensive (10,000+ tokens):
- ❌ Reading entire 500+ line files
- ❌ Generating large documents (API docs, guides)
- ❌ "Explain the whole codebase"
- ❌ Multiple parallel file reads (5+ files at once)

### Moderate (1,000-5,000 tokens):
- ⚠️ Reading 100-200 line files
- ⚠️ Running tests and reading output
- ⚠️ Making code changes to large files
- ⚠️ Using `grep` with large result sets

### Cheap (100-500 tokens):
- ✅ Targeted `grep` searches (specific function name)
- ✅ Reading specific line ranges (`offset` + `limit`)
- ✅ Simple questions with clear context
- ✅ Terminal commands with short output

---

## 🛠️ Practical Examples

### Example 1: Debugging a Feature

❌ **Inefficient Approach:**
```
You: "The scan feature isn't working, help me fix it"

Cursor reads:
- frontend/src/pages/ScanSession.tsx (1000 lines)
- frontend/src/utils/smartMatch.ts (300 lines)
- frontend/src/utils/ocr.ts (200 lines)
- backend/src/controllers/scan.controller.js (400 lines)
= ~10,000+ tokens
```

✅ **Efficient Approach:**
```
You: "When I click the camera button in ScanSession.tsx, nothing happens. 
     Check the handleCameraClick function around line 120."

Cursor reads:
- frontend/src/pages/ScanSession.tsx (lines 100-150 only)
= ~500 tokens
```

### Example 2: Adding a Feature

❌ **Inefficient:**
```
You: "Add a delete button to the dashboard"
```
Cursor has to explore the entire Dashboard to understand structure.

✅ **Efficient:**
```
You: "In Dashboard.tsx around line 340 (inside the Need Follow-up card), 
     add a Delete button next to the Collect button.
     It should call onDeleteItem(group)."
```
You've already found the location, Cursor just implements it.

### Example 3: Understanding Code

❌ **Inefficient:**
```
You: "How does the email notification system work?"
```
Reads 15+ files to explain the full system.

✅ **Efficient:**
```
Step 1 (You): Search for "sendBulk" in workspace (Cmd+Shift+F)
Step 2 (You): Find it's in email.controller.js
Step 3 (You): "Explain the sendBulkNotification function in email.controller.js"
```
Only reads 1 file, you already know where to look.

---

## 📝 Session Planning Template

Before starting a Cursor session, write down:

```
Today's Goal: [One specific thing]
Files I'll Need: [List 2-3 files max]
What I Already Know: [Context you can provide]
Specific Question: [Exact what you need help with]
```

**Example:**
```
Goal: Fix the "End Session" button position in Scan page
Files: frontend/src/pages/ScanSession.tsx
What I Know: Button is currently in header (around line 635)
Question: Move "End Session" button to bottom with camera buttons 
          and make it red
```

---

## 🎓 Advanced Techniques

### 1. **Use Comments to Guide Cursor**
Instead of asking Cursor to find where to add code:
```typescript
// TODO: Add Waive Fee button here
// Should call onWaiveFee(group) and close dropdown
```
Then ask: "Implement the TODO at line 442 in GroupedFollowUp.tsx"

### 2. **Reference Line Numbers**
When you can see the code in your editor:
```
"In SendEmailModal.tsx line 280, add sent_by to the API call"
```
vs
```
"Update SendEmailModal to include sent_by in the email API"
```
First one is 10x more efficient.

### 3. **Use Grep When Searching**
Instead of asking "where is the email sending logic?":
```
You: grep for "sendNotificationEmail" and tell me which file to update
```

### 4. **Batch Related Changes**
Instead of:
- Ask → Fix → Test → Ask → Fix → Test

Do:
- List all 5 things to fix → Cursor does all 5 → Test once

---

## 📅 Usage Monitoring Tips

### Check Your Usage:
1. Look at Cursor's usage indicator (bottom right)
2. If you're at 80% with 2 weeks left → slow down!
3. Save complex tasks for when usage resets

### When Usage is Low (Start of Cycle):
- ✅ Generate documentation
- ✅ Large refactoring tasks
- ✅ Explore unfamiliar codebases
- ✅ Complex debugging

### When Usage is High (End of Cycle):
- ✅ Targeted bug fixes only
- ✅ Simple code updates
- ✅ Use workspace search yourself
- ✅ Save big tasks for next cycle

---

## 🚫 Common Usage Traps

### Trap 1: "Explain Everything"
Don't ask open-ended questions about entire systems.

### Trap 2: Iterative Refinement
Asking for "a bit more styling" 5 times in a row.
Better: Describe all the styling you want upfront.

### Trap 3: Letting Cursor Explore
"Find where X is used and update it"
Better: You find it with Cmd+Shift+F, then tell Cursor exactly where.

### Trap 4: Context Pollution
Having 10+ files open in tabs confuses Cursor about what's relevant.
Close unused tabs!

### Trap 5: Re-asking Same Questions
If you got an answer, save it in a notes file.
Don't make Cursor re-explain it later.

---

## 💡 Pro Tips

1. **Keep a `NOTES.md` file** with decisions, solutions, and explanations
2. **Use comments** to mark where you need help before asking Cursor
3. **Close AI panel** when just reading/thinking (Cmd+L to reopen)
4. **Learn the keyboard shortcuts** - reduces back-and-forth
5. **One task per chat** - Don't let conversations drift to multiple topics

---

## 📊 Your Personal Usage Pattern

Based on our recent session, you tend to:
- ✅ Work on multiple features in one session (high usage)
- ✅ Generate comprehensive docs (high usage)
- ✅ Ask open-ended questions (moderate usage)
- ✅ Iterate on UI/UX details (moderate usage)

### Recommendations for You:
1. **Break demo prep into 3 sessions** instead of 1 marathon
2. **Use Cmd+Shift+F more** before asking "where is X?"
3. **Plan your changes** on paper first, then ask Cursor to implement
4. **Batch UI tweaks** - list 5 changes at once instead of asking 5 times

---

## 🎯 30-Day Challenge

### Week 1: Awareness
- Track what questions use the most usage
- Notice when you ask the same thing twice

### Week 2: Workspace Search
- Use Cmd+Shift+F for every "where is..." question
- Only ask Cursor to implement, not to find

### Week 3: Targeted Questions
- Always include file names and line numbers
- No open-ended "help me understand X" questions

### Week 4: Session Planning
- Write 1-sentence goal before starting
- Stay focused on that one goal

---

## 📞 Quick Reference Card

**Before asking Cursor anything:**
1. Can I find this with Cmd+Shift+F? (Yes → Do it yourself)
2. Do I know which file? (No → Search first)
3. Can I be more specific? (Yes → Add line numbers)
4. Is this part of a bigger task? (Yes → List all changes at once)

**Good question format:**
```
"In [filename.tsx] around line [X], 
[specific change needed] 
because [brief context]"
```

---

## 🎓 Remember

**Cursor is most efficient when:**
- You know WHERE to change
- You just need help with HOW

**Cursor is least efficient when:**
- It has to explore to understand your codebase
- You ask vague, exploratory questions
- You iterate on the same thing 10 times

---

**Save this guide and reference it before starting each Cursor session!**

Your usage will thank you. 🙏



