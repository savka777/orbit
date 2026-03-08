# Fix Squished Layout & Alignment Issues

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the Orbit app's layout so nothing appears squished and all elements are properly aligned across the sidebar, main content area, and all screens.

**Architecture:** The root issue is a combination of: (1) the main content area missing a top spacer to match the sidebar's Electron drag region, causing vertical misalignment; (2) responsive breakpoints that don't account for the 260px sidebar, making grids/cards cramp; (3) the Welcome screen's large bottom-margin pushing content into awkward positions; and (4) the Electron window's dark background color flashing before the white UI loads. We fix each in isolation.

**Tech Stack:** React, Tailwind CSS v4, Electron, Vite

---

### Task 1: Add drag-region top spacer to main content area

The Sidebar has a `<div className="drag-region h-7 w-full shrink-0" />` at the top to account for macOS traffic lights in Electron's `hiddenInset` title bar. But the main content area has NO matching spacer, so sidebar content starts 28px lower than main content. This creates a visible vertical misalignment.

**Files:**
- Modify: `src/App.tsx:115`

**Step 1: Add the drag-region spacer to the main element**

In `src/App.tsx`, change the `<main>` element from:

```tsx
<main className="flex-1 overflow-hidden bg-white">
```

to wrap the content with a flex-col layout and add a matching drag-region spacer:

```tsx
<main className="flex-1 flex flex-col overflow-hidden bg-white">
  <div className="drag-region h-7 w-full shrink-0" />
```

And close the main with the existing content inside the remaining flex-1 space. The motion.div should get `className="flex-1 overflow-hidden"` instead of `className="h-full w-full"` so it fills the space below the drag region.

Full replacement for lines 115-129:

```tsx
<main className="flex-1 flex flex-col overflow-hidden bg-white">
  <div className="drag-region h-7 w-full shrink-0" />
  <AnimatePresence mode="wait">
    <motion.div
      key={currentScreen}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex-1 overflow-hidden"
    >
      {renderScreen()}
    </motion.div>
  </AnimatePresence>
</main>
```

**Step 2: Verify visually**

Run: `cd /Users/sav/Desktop/free-for-all/orbit && npm run dev`

Open http://localhost:5173 in a browser. The top of the main content should now align vertically with the top of the sidebar content (both start below the drag region).

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix: add drag-region spacer to main content for vertical alignment"
```

---

### Task 2: Fix Electron window background color mismatch

The Electron window has `backgroundColor: '#0F172A'` (dark slate) but the app uses a white theme. This causes a dark flash before the app renders.

**Files:**
- Modify: `electron/main.ts:18`

**Step 1: Change backgroundColor to white**

In `electron/main.ts`, change:

```ts
backgroundColor: '#0F172A',
```

to:

```ts
backgroundColor: '#FFFFFF',
```

**Step 2: Commit**

```bash
git add electron/main.ts
git commit -m "fix: match electron bg color to white app theme"
```

---

### Task 3: Fix responsive grid breakpoints to account for sidebar width

Tailwind's responsive breakpoints (`md:`, `lg:`) use viewport width, but the sidebar consumes 260px. So `lg:grid-cols-3` fires at 1024px viewport but only has ~764px of content space — too tight for 3 columns. Same issue with `md:grid-cols-2`.

**Files:**
- Modify: `src/screens/ModelLibrary.tsx:156`
- Modify: `src/screens/MCPTools.tsx:250`
- Modify: `src/screens/HardwareAudit.tsx:158`

**Step 1: Bump grid breakpoints up one tier in ModelLibrary**

In `src/screens/ModelLibrary.tsx`, change line 156:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
```

to:

```tsx
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
```

This ensures 2-column grid only fires when there's enough content space (1024px viewport = ~764px content), and 3-column waits until 1280px viewport (~1020px content).

**Step 2: Bump grid breakpoints in MCPTools**

In `src/screens/MCPTools.tsx`, change line 250:

```tsx
<motion.div
  className="grid grid-cols-1 md:grid-cols-2 gap-4"
```

to:

```tsx
<motion.div
  className="grid grid-cols-1 lg:grid-cols-2 gap-4"
```

**Step 3: Bump grid breakpoints in HardwareAudit**

In `src/screens/HardwareAudit.tsx`, change line 158:

```tsx
<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
```

to:

```tsx
<div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
```

**Step 4: Verify visually**

Run: `npm run dev`

Open http://localhost:5173. Resize the browser to various widths. Grids should only go multi-column when there's enough space for the content to breathe (no squished cards).

**Step 5: Commit**

```bash
git add src/screens/ModelLibrary.tsx src/screens/MCPTools.tsx src/screens/HardwareAudit.tsx
git commit -m "fix: bump responsive grid breakpoints to account for sidebar width"
```

---

### Task 4: Fix Welcome screen spacing so content doesn't feel cramped

The Welcome screen has `mb-32` (128px) between the heading group and suggestion cards. Combined with the centered flex layout, this can push elements into awkward positions on smaller windows. The suggestions should sit closer to the input, not be pushed upward by a huge margin.

**Files:**
- Modify: `src/screens/Welcome.tsx:32`

**Step 1: Reduce the heading-to-suggestions gap**

In `src/screens/Welcome.tsx`, change line 32:

```tsx
<div className="flex flex-col items-center mb-32">
```

to:

```tsx
<div className="flex flex-col items-center mb-12">
```

This reduces the gap from 128px to 48px — still spacious but won't push content to extremes on smaller viewports.

**Step 2: Verify visually**

Run: `npm run dev`

The Welcome screen should have the Orbit icon, heading, model selector, then suggestion cards with comfortable spacing — not a massive void between heading and cards.

**Step 3: Commit**

```bash
git add src/screens/Welcome.tsx
git commit -m "fix: reduce welcome screen heading gap for better viewport fit"
```

---

### Task 5: Remove redundant CSS reset that may conflict with Tailwind v4

The `index.css` has a manual `* { margin: 0; padding: 0; box-sizing: border-box; }` reset, but Tailwind v4's `@import "tailwindcss"` already includes a full preflight reset in `@layer base`. The manual reset sits outside any layer, giving it higher specificity. While functionally equivalent now, it could interfere with Tailwind's layered cascade in edge cases.

**Files:**
- Modify: `src/index.css:8-12`

**Step 1: Remove the redundant universal reset**

In `src/index.css`, delete lines 8-12:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

Tailwind's preflight already handles all of this.

**Step 2: Verify visually**

Run: `npm run dev`

Everything should look identical — the Tailwind preflight handles the reset.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "fix: remove redundant CSS reset (Tailwind v4 preflight handles it)"
```

---

### Task 6: Add min-width to main content to prevent extreme squishing

When the window is at its minimum width (900px in Electron), the content area is only 640px (900 - 260 sidebar). Add a min-width so content never gets unreasonably cramped.

**Files:**
- Modify: `src/App.tsx:115` (the main element updated in Task 1)

**Step 1: Add min-width to the main element**

In `src/App.tsx`, update the main className (from Task 1's result):

```tsx
<main className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
```

The `min-w-0` is critical for flex children — without it, flex items won't shrink below their content width, which can cause overflow instead of proper text truncation and wrapping.

Note: `min-w-0` is actually a flex layout fix, not a minimum width. By default, flex items have `min-width: auto` which prevents them from shrinking below their content. Setting `min-w-0` allows proper shrinking.

**Step 2: Verify visually**

Run: `npm run dev`

Resize the window to minimum width. Content should wrap/scroll gracefully instead of overflowing or getting clipped.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix: add min-w-0 to main content for proper flex shrinking"
```

---

### Task 7: Final visual verification across all screens

**Step 1: Check each screen at multiple viewport widths**

Run: `npm run dev`

Open http://localhost:5173 and verify each screen at these widths:
- 900px (Electron min-width)
- 1024px (typical laptop)
- 1280px (default Electron window)
- 1440px+ (large monitor)

Screens to check:
- Welcome (centered content, suggestion cards, input bar)
- Chat (messages area, input bar alignment)
- Hardware Audit (scan button centered, results grid)
- Model Library (featured card, filter bar, model grid)
- MCP Tools (header, tool cards grid)

**Step 2: Check sidebar collapse behavior**

Click the sidebar collapse button. Verify that when collapsed (64px), the content area expands properly and all layouts adjust.

**Step 3: Run in Electron**

Run: `npm run dev:electron`

Verify:
- White background (no dark flash)
- Traffic lights don't overlap content
- Main content aligns with sidebar content vertically
- All screens look correct in the Electron frame
