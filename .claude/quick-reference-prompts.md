# Quick Reference: Better Prompts for Common Tasks

Based on insights analysis of 60 sessions. Use these to avoid common friction patterns.

---

## 🎨 UI/UX Implementation

### Problem: Claude builds the wrong UI pattern (split-panel instead of expandable card)

**Use this prompt:**
```
I want [PATTERN NAME] specifically — NOT [ALTERNATIVE PATTERN].

Here's exactly how it should work:
1. User taps [X]
2. [Y] happens visually
3. [Z] is the final state

Before writing any code, confirm you understand this interaction by describing
it back to me in one sentence.
```

**Example:**
```
I want an expandable card specifically — NOT a split-panel master-detail layout.

Here's exactly how it should work:
1. User taps the order card
2. The card expands in-place to show item details below the summary
3. Tapping again collapses it back to summary view

Before writing any code, confirm you understand this interaction.
```

---

## 🎨 CSS Changes

### Problem: CSS changes break dark theme, cause overflow, or introduce visual regressions

**Use this prompt:**
```
After making these CSS changes, list every visual element that could be affected.

For each one, verify:
1. Dark theme contrast is readable (check color combinations)
2. No overflow on screens 768px-1920px wide
3. Borders and spacing match adjacent components

Show me the verification results BEFORE considering the task complete.
```

**Example:**
```
Update the card border style to use solid 2px instead of dashed 1px.

After making this change, list every visual element that could be affected.
For each one, verify: 1) dark theme contrast is readable, 2) no overflow on
screens 768px-1920px wide, 3) borders match adjacent components.

Show me the verification results.
```

---

## ⚡ Skip Planning, Start Implementing

### Problem: Session ends with a plan document but no actual code

**Use this prompt:**
```
Implement this change now. Do NOT create a plan document or ask for approval —
go straight to code.

If you need to make assumptions, make reasonable ones and note them in a comment.
```

**Example:**
```
Add a loading spinner to the payment button.

Implement this now. Do NOT create a plan — go straight to code.
If you need to make assumptions about spinner style, use the existing one from
the cart page.
```

---

## 🐛 Bug Fixing with Context

### Problem: Claude fixes symptoms instead of root cause, or misunderstands the bug

**Use this prompt:**
```
I have a bug: [describe the bug in detail - what happens, what should happen]

Before fixing it:
1. Read the relevant files to understand the current implementation
2. Explain what you think is causing the bug
3. Propose a fix and explain why it will work

Then implement the fix.
```

**Example:**
```
I have a bug: The discount amount shows as "$0" even when a promo code is applied.

Before fixing it:
1. Read the checkout page and order calculation files
2. Explain what you think is causing the bug
3. Propose a fix and why it will work

Then implement the fix.
```

---

## 🗄️ Database Changes

### Problem: Claude suggests `db reset` or creates migration that breaks existing data

**Use this prompt:**
```
I need to [describe database change].

IMPORTANT:
- Do NOT use `supabase db reset` — create a migration file instead
- The migration must preserve existing data
- Include a rollback comment at the bottom

After creating the migration, explain what it does and how to roll it back.
```

**Example:**
```
I need to add a `notes` column to the orders table.

IMPORTANT:
- Do NOT use db reset — create a migration file
- Preserve existing data (NULL is fine for existing rows)
- Include rollback comment

Explain what the migration does and how to roll it back.
```

---

## 📝 Code Review / PR Comments

### Problem: Claude misunderstands "fix the comments" (thinks it means fix code, not respond to review)

**Use this prompt:**
```
I received PR review comments. I need you to RESPOND to the comments,
not fix the code yet.

For each comment:
1. Quote the reviewer's comment
2. Explain whether you agree/disagree
3. If you agree, explain the proposed fix
4. If you disagree, explain why the current implementation is correct

Do NOT make code changes — just draft responses.
```

---

## 🔍 Multi-File Search

### Problem: Claude searches wrong files or misses relevant code

**Use this prompt:**
```
I need to find [what you're looking for] in the codebase.

Search strategy:
1. Start with [specific file/directory if known]
2. Look for [specific function/class/pattern names]
3. Check related files if not found

Show me what you find with file paths and line numbers.
```

**Example:**
```
I need to find where order totals are calculated in the codebase.

Search strategy:
1. Start with src/services/ (server actions)
2. Look for functions with "total" or "calculate" in the name
3. Check src/lib/utils/ for calculation helpers

Show me what you find with file paths and line numbers.
```

---

## 🧪 Testing a Feature

### Problem: Claude doesn't thoroughly test edge cases or only tests happy path

**Use this prompt:**
```
Test this feature: [feature name]

Test cases to cover:
1. Happy path: [describe]
2. Empty state: [describe]
3. Error case: [describe]
4. Edge case: [describe]

For each test, show me:
- What you're testing
- The command/interaction
- Expected result
- Actual result
```

**Example:**
```
Test the cart checkout flow.

Test cases:
1. Happy path: Valid items, valid promo code, successful payment
2. Empty state: No items in cart
3. Error case: Invalid promo code
4. Edge case: Item becomes unavailable during checkout

For each test, show me what you're testing, the steps, expected vs actual result.
```

---

## 📦 Package Installation

### Problem: Claude installs unnecessary packages or doesn't justify why

**Use this prompt:**
```
Before installing any new packages:

1. Check if the functionality already exists in:
   - shadcn/ui components
   - Supabase built-ins
   - src/lib/utils/ helpers
   - Next.js features

2. If you truly need a new package, explain:
   - What functionality it provides
   - Why existing tools can't do it
   - Package size and bundle impact

Then ask for approval before installing.
```

---

## 🎯 Focused Changes Only

### Problem: Claude refactors surrounding code, adds comments, or makes "improvements" beyond the request

**Use this prompt:**
```
[Your specific request]

IMPORTANT: Make ONLY the changes needed for this request.
- Do NOT refactor surrounding code
- Do NOT add comments unless the logic is non-obvious
- Do NOT add error handling for impossible scenarios
- Do NOT add type annotations to unchanged code

Stay focused on the specific change requested.
```

---

## 💡 Quick Tips

1. **Be specific about patterns**: Say "expandable card" not "show more details"
2. **Include verification steps**: Especially for CSS/UI changes
3. **Provide examples**: Show what you want, not just describe it
4. **Block premature planning**: Say "implement now" if you know what you want
5. **Require justification**: For new packages, architectural changes, refactors

---

## 🚨 Red Flags - Stop and Redirect

If Claude says any of these, interrupt and clarify:

- "Let me create a plan first..." → "No, implement now"
- "I'll refactor this while I'm here..." → "Only make the requested change"
- "Should I also add..." → "No, stay focused"
- "I'll use db reset to..." → "NEVER use db reset"
- "This might work..." → "Explain your reasoning first"

---

## 📊 Track Your Success

After using these prompts for 2 weeks, note:
- How many correction cycles you needed (target: 50% reduction)
- How many sessions ended with working code (target: 80%+)
- How many CSS iterations per change (target: 1-2 max)

Adjust prompts based on what works for your workflow.
