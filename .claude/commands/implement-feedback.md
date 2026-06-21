---
description: Fetch all approved DOM feedback entries and implement them. Groups entries by page to minimise token usage — one file lookup per page, batch PATCH at the end.
---

You are implementing approved user feedback from the DOM feedback system.
Work efficiently: read each source file once, fix all issues in it, then move on.

## Step 1 — Mint an admin token

```bash
node -e "
  const jwt = require('backend_nest/node_modules/jsonwebtoken');
  const fs  = require('fs');
  const env = Object.fromEntries(
    fs.readFileSync('backend_nest/.env','utf8')
      .split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => l.split('=').map(s => s.trim()))
      .map(([k,...v]) => [k, v.join('=')])
  );
  const token = jwt.sign(
    { id: 'cli', username: 'claude-cli', role: 'admin' },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  console.log(token);
"
```

Store the output as `IMPL_TOKEN`.

## Step 2 — Fetch approved entries

```bash
curl -s "http://localhost:3000/api/v1/inspect-dom-capture/feedback?status=approved&limit=100" \
  -H "Authorization: Bearer $IMPL_TOKEN"
```

If `entries` is empty → print "No approved entries." and stop.

If `total` is less than 3 → print "Only N approved entries found. Minimum batch size is 3 — approve more entries and re-run." and stop.

**Group entries by `page_url` path** (strip the origin, keep the path).
Print the groups:

```
Page /some-path  → 3 entries
Page /other-path → 1 entry
```

## Step 3 — Process one page-group at a time

For each group:

**3a. Locate the file once.**
Use the page path + the `dom_path` / `css_selector` values from the entries in this group to find the relevant component(s). Search only `frontend/src/pages` and `frontend/src/components` — do not search the full `frontend/src` tree. Do one search, identify the file(s). Do not re-search for each entry.

**3b. Read the file(s) once.**
Read the component file into context. Also check for a sibling CSS file with the same name (e.g. `AdminFeedback.tsx` → `AdminFeedback.css`) and read it if it exists. If the fix involves a class name that isn't defined in the component file, search `frontend/src/App.css` and `frontend/src/index.css` for it — read whichever one contains it. Do not re-read any file you already have in context.

**3c. Check each selector for nth-child / nth-of-type patterns.**
Before implementing, inspect every `css_selector` in the group. If it contains `:nth-child`, `:nth-of-type`, `:nth-last-child`, or a bare index like `> li:nth-of-type(3)`, treat it as a sampled item from a list — the user clicked one instance but the feedback almost certainly applies to all instances of that element type.

In that case:

- Strip the nth qualifier to get the general selector (e.g. `ul.card-list > li:nth-of-type(3)` → `ul.card-list > li`)
- Find the component that renders the list/repeated element
- Apply the fix to the template/map callback so **all items** are fixed, not just the nth one
- Note in `ai_comment` that the fix was applied to all items, not just the selected one

If the nth selector clearly refers to a unique structural position (e.g. a layout with exactly 3 fixed columns and the 2nd is intentionally different), apply the fix only to that position and explain in `ai_comment`.

**3d. Apply all fixes for this group in one edit pass.**
Go through every entry in the group. For each:

- `message` — what to change
- `css_selector` / `dom_path` — which element (accounting for nth-pattern analysis above)
- `dev_comment` — admin constraint (overrides `message` if conflicting)

Apply all changes to the file in a single edit. Do not write the file multiple times.

**3e. Record the result for each entry** (implemented / failed + reason). Do not PATCH yet.

## Step 4 — Batch PATCH all results

After all groups are processed, send one PATCH per entry:

```bash
curl -s -X PATCH "http://localhost:3000/api/v1/inspect-dom-capture/feedback/<id>" \
  -H "Authorization: Bearer $IMPL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "<implemented|failed>", "ai_comment": "<what changed and why, max 600 chars>"}'
```

Run these sequentially. Do not skip any entry regardless of outcome.

## Step 5 — Summary

```
| ID       | Page     | Message preview    | Result         |
|----------|----------|--------------------|----------------|
| abc123…  | /home    | "move button…"     | ✅ implemented |
| def456…  | /home    | "fix label color…" | ✅ implemented |
| ghi789…  | /ticker  | "add tooltip…"     | ❌ failed — ambiguous selector |
```

`Implemented: X  |  Failed: Y  |  Total: N`

## Rules

- **One file read per component** — if two entries point to the same file, fix both in one pass.
- **Never re-search** a page you already located.
- Only touch `frontend/src/pages`, `frontend/src/components`, and their sibling CSS files (plus `App.css` / `index.css` for global styles) unless the message explicitly describes a backend issue.
- If `dev_comment` contradicts `message`, follow `dev_comment`.
- Never mark implemented without an actual code change.
- Only set `status` and `ai_comment` in PATCH requests — never touch `dev_comment`, it belongs to the human reviewer.
- If the backend is unreachable, stop immediately and report.
