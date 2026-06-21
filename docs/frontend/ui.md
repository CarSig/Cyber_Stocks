# UI Guidelines — Frontend

This project uses **shadcn/ui** for all general UI components and **lightweight-charts** for stock charts. Tailwind v4 handles utility styling alongside the existing CSS variable system.

---

## Rules of thumb (read first)

- **Use shadcn/ui (`src/components/ui/`) for all buttons, inputs, selects, badges, dropdowns, dialogs.** Do not write custom equivalents.
- **Prefer CSS classes over inline styles.** Always use a CSS class instead of a `style` prop unless the value is genuinely dynamic (computed at runtime from data, user input, or state). Static values — colors, spacing, layout, display — belong in a stylesheet. The only acceptable inline styles are ones where the value changes based on JS state or props (e.g. `style={{ width: pct + '%' }}` or `style={{ color: cfg.color }}`).
- **Dark-first; do not add a light mode.** The theme is dark-only by design. Don't introduce a `prefers-color-scheme: light` branch.
- **Do not migrate chart controls or `DatePicker` to shadcn.** Chart-internal buttons (inside `StockChart`, `MultiChart`) and the `DatePicker` atom are intentionally kept as native elements — tightly coupled to chart toolbar logic / native date input behavior.
- **No `useMemo` / `useCallback`** — the React Compiler (`@babel/plugin-react-compiler` in `vite.config.js`) handles memoization. Manual hooks are unnecessary and can be skipped by the compiler (see warnings about "Existing memoization could not be preserved").

---

## Setup

### 1. Install Tailwind v4

```bash
cd frontend
npm install tailwindcss @tailwindcss/vite
```

Add the plugin to `vite.config.js`:

```js
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react({ babel: { plugins: [["babel-plugin-react-compiler"]] } })],
});
```

Add to the top of `src/index.css`:

```css
@import "tailwindcss";
```

### 2. Install shadcn

```bash
npx shadcn@latest init
```

Use these settings when prompted:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**

Add components as needed:

```bash
npx shadcn@latest add button input select badge tooltip skeleton dropdown-menu dialog
```

---

## Design Tokens — CSS Variable Mapping

shadcn expects specific CSS variable names. Map the existing tokens in `src/index.css` inside the `:root` block:

| Existing variable     | shadcn name           | Value          |
|-----------------------|-----------------------|----------------|
| `--surface-0`         | `--background`        | `#141417`      |
| `--surface-1`         | `--card`              | `#1c1c21`      |
| `--surface-2`         | `--popover`           | `#242429`      |
| `--text-primary`      | `--foreground`        | `#9ba3af`      |
| `--text-primary`      | `--card-foreground`   | `#9ba3af`      |
| `--text-muted`        | `--muted-foreground`  | `#5a6070`      |
| `--surface-3`         | `--muted`             | `#2b2b31`      |
| `--color-blue`        | `--primary`           | `#3b82f6`      |
| `--text-h`            | `--primary-foreground`| `#c4cad4`      |
| `--border-input`      | `--border`            | `#2e3340`      |
| `--border-input`      | `--input`             | `#2e3340`      |
| `--color-blue`        | `--ring`              | `#3b82f6`      |
| `--color-red`         | `--destructive`       | `#ef4444`      |

Add these aliases to `:root` in `index.css` so shadcn components resolve correctly without changing any existing variable names.

---

## Component Usage Rules

### Buttons

| Old class                        | shadcn replacement                        |
|----------------------------------|-------------------------------------------|
| `.btn.btn-primary`               | `<Button>`                                |
| `.btn.btn-ghost`                 | `<Button variant="ghost">`                |
| `.btn.btn-ghost.active`          | `<Button variant="ghost" data-active>`    |
| `.btn.btn-chart`                 | `<Button variant="outline" size="sm">`    |
| `.btn.btn-chart.active`          | `<Button size="sm">`                      |

### Inputs

| Pattern                          | shadcn replacement                        |
|----------------------------------|-------------------------------------------|
| Chat message input               | `<Input>`                                 |
| Lag days number input            | `<Input type="number" min={0} max={30}`   |
| Any text/search input            | `<Input>`                                 |

### Selects

| Pattern                          | shadcn replacement                        |
|----------------------------------|-------------------------------------------|
| Compare ticker dropdown          | `<Select>` + `<SelectItem>`               |
| Any native `<select>`            | `<Select>`                                |

### Other components

| Pattern                              | shadcn component       |
|--------------------------------------|------------------------|
| Notification bell dropdown           | `<DropdownMenu>`       |
| Sentiment / topic / entity tags      | `<Badge>`              |
| Loading placeholders                 | `<Skeleton>`           |
| Stat tooltips (correlation labels)   | `<Tooltip>`            |
| Confirmation or info overlays        | `<Dialog>`             |

---

## Migration Guide

### Existing components to replace

**`NewsSection.jsx`**
- `<button className="btn btn-primary">` → `<Button>`
- `<button className="btn btn-ghost">` → `<Button variant="ghost">`
- `<span className="news-sentiment ...">` → `<Badge variant="outline">` with inline color
- `<span className="news-badge">` → `<Badge variant="secondary">`
- `<span className="news-topic/entity">` → `<Badge>`

**`Chat.jsx`**
- `<input className="chat-input">` → `<Input>`
- `<button className="btn btn-primary">` → `<Button>`

**`CorrelationBox.jsx`**
- `<input type="number" className="correlation-lag-input">` → `<Input type="number">`

**`NotificationBell.jsx`**
- Custom dropdown div → `<DropdownMenu>` + `<DropdownMenuContent>`

**`Ticker.jsx`**
- `<select>` for compare ticker → `<Select>`

**`Simulation.jsx`**, **`Analysis.jsx`**, other pages
- Any `.btn` → `<Button>` with appropriate variant

---

## What NOT to Replace

| Component                  | Reason                                              |
|----------------------------|-----------------------------------------------------|
| `charts/StockChart.jsx`    | Uses lightweight-charts; no shadcn equivalent       |
| `charts/MultiChart.jsx`    | Same                                                |
| `charts/CandlestickChart.jsx` | Same                                             |
| `.btn-chart` inside charts | Tightly coupled to chart toolbar logic              |
| Layout CSS in `App.css`    | `.ticker-layout`, `.chat-sidebar`, grid/flex layout |
| CSS variable definitions   | Keep all existing `--surface-*`, `--color-*` vars   |
