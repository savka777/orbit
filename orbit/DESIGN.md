# Orbit Design System

> **For agents: READ THIS ENTIRE FILE before touching any component, screen, or style.** This is the single source of truth for Orbit's visual design. If your implementation conflicts with this document, change your implementation. Do not improvise. Do not "improve" the aesthetic. Reuse existing patterns. When in doubt, match the Codex desktop app aesthetic.

---

## Design Philosophy

Orbit's visual identity is modeled after **OpenAI Codex** — the desktop coding agent. It is NOT a consumer chat app. It is NOT a colorful SaaS dashboard. It is a professional, dark, quiet tool.

### The Feeling

- **Expensive and restrained.** Like a $3,000 piece of software.
- **Dark and focused.** Deep charcoal workspace, not ink-black.
- **Glassy and translucent.** Sidebar and surfaces have subtle transparency.
- **Borderless inputs.** Text flows freely without visible borders or outlines.
- **Generous spacing.** Content never feels crammed against edges.

### Reference App

The primary visual reference is **OpenAI Codex desktop** (the app in the user's screenshots). Key characteristics borrowed:

- Frosted blue-gray translucent sidebar
- Large, confident hero text on the welcome screen
- Borderless, seamless chat input
- Nav items with 13px text, 18px icons, comfortable row padding
- Lots of top spacing — content starts well below the title bar
- Warm charcoal main surface (not pure black)

---

## Non-Negotiables

These rules are absolute. No exceptions.

1. **Dark mode only.** Never create light surfaces unless the user explicitly asks.
2. **No emoji anywhere in the UI.** Not in buttons, badges, headings, empty states, or placeholder text. Use Lucide icons or plain text.
3. **No decorative Unicode.** No bullets, dots, or typographic symbols as separators. Use `/` or plain text.
4. **No category tags on model cards.** No "chat", "code", "creative" pills. They were removed intentionally.
5. **No borders on the chat input.** The `app-input-shell` has `border: none`, `outline: none`, `box-shadow: none` in all states including focus.
6. **No entrance animations on cards or lists.** No stagger, no spring, no bounce.
7. **No brand logo in the sidebar.** The OrbitBrand/OrbitMark was removed from the sidebar. Do not add it back.
8. **Content must have generous top spacing.** 84px minimum from window top to first content. See Layout section.

---

## Color System

### CSS Tokens (`:root` in `src/index.css`)

| Token | Value | Usage |
|-------|-------|-------|
| `--app-bg` | `#0b0b0d` | Base background behind everything |
| `--app-panel` | `rgba(27, 28, 32, 0.76)` | Standard card/panel background |
| `--app-border` | `rgba(255, 255, 255, 0.08)` | Default borders |
| `--app-border-strong` | `rgba(255, 255, 255, 0.12)` | Hover/emphasized borders |
| `--app-text` | `#f6f5f3` | Primary text |
| `--app-text-muted` | `#9f9c97` | Muted text |
| `--app-text-soft` | `#706d68` | Very quiet metadata |
| `--app-accent` | `#5d79ff` | Blue accent for active states, toggles |
| `--app-teal` | `#35c8b0` | Secondary accent, used sparingly |

### Practical Rules

- Text on dark: use `text-white`, `text-stone-50`, `text-stone-100`, or `text-white/{alpha}`
- Borders: use `border-white/6` to `border-white/12` range
- Inactive/muted: use `text-white/30` to `text-white/60`
- Active/selected: use `text-white` with `font-medium`
- Hover fills: use `bg-white/[0.04]` to `bg-white/[0.05]`
- Blue accent: only for toggles, progress bars, connected status dots

---

## Typography

### Font Stacks

```
Sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif
Mono: 'SF Mono', ui-monospace, 'JetBrains Mono', monospace
```

### Type Scale

| Size | Usage |
|------|-------|
| `text-[11px]` | metadata, pills, timestamps, status labels, helper text |
| `text-[12px]` | descriptions, thread metadata, config blocks, nav section headers |
| `text-[13px]` | default UI text, nav items, input text, card titles |
| `text-[14px] font-semibold` | section headings, screen titles |
| `text-[16px] font-semibold` | featured card model name |
| `text-[28px]` | welcome subtitle ("ai, free for all") |
| `text-[36px] font-semibold` | welcome headline ("Orbit") |

### Rules

- Default app copy is `13px`.
- Welcome screen uses large display sizes: `36px` headline, `28px` subtitle.
- Use `font-mono` for model names, parameter counts, timestamps, config blocks.
- Never use decorative fonts or font-weight changes for emphasis — use alpha/color instead.

---

## Layout Architecture

### Top Spacing (CRITICAL)

Content must never hug the top of the window. The spacing is built in layers:

1. **Drag region** in `App.tsx`: `h-11` (44px) — macOS title bar dragging area
2. **Motion wrapper** `pt-10` (40px) — fixed non-scrollable padding on the `motion.div`

Total: **84px of fixed, non-scrollable space** from window top to first content pixel.

**Why this matters:** All spacing is OUTSIDE scroll containers. Screens must NOT add their own top padding (`pt-2`, etc.) inside `overflow-y-auto` divs — that padding scrolls away and breaks the layout.

### Main Shell Structure

```
app-shell (flex row, full viewport)
├── Sidebar (260px expanded / 48px collapsed)
└── main.app-main-surface (flex-1, flex-col)
    ├── drag-region (h-11, shrink-0)
    └── AnimatePresence > motion.div (flex-1, flex-col, pt-10, min-h-0, overflow-hidden)
        └── Screen component (flex-1, internal scrolling)
```

### Screen Dimensions

- Chat/composer: max-width `640px`
- Grid screens (models, tools, hardware results): max-width `960px`
- Welcome: max-width `980px`
- Sidebar expanded: `260px`
- Sidebar collapsed: `48px`

---

## Sidebar

The sidebar follows the Codex desktop pattern: frosted translucent glass with a cool blue tint.

### Specification

```
Expanded width: 260px
Collapsed width: 48px
Background: translucent blue-gray gradient (rgba(30,35,48,0.72) to rgba(20,24,36,0.72))
Backdrop filter: blur(24px)
Right border: 1px solid rgba(255, 255, 255, 0.06)
Box shadow: none
```

### Structure (top to bottom)

1. **Drag region** (`h-7`) + spacer (`h-3`) = 40px from window top
2. **Primary nav** — "New thread" first, then Hardware, Models, Tools
3. **Threads section** — section header with collapse toggle, thread history list
4. **Flex spacer** — pushes collapse control to bottom
5. **Collapse control** — chevron button with top border divider

### Nav Item Pattern

```
gap-2.5, rounded-lg, px-2.5, py-2, text-[13px]
Icons: 18px, strokeWidth 1.5
Active: text-white, font-medium
Inactive: text-white/60, hover:text-white, hover:bg-white/[0.04]
```

There is **no brand logo** in the sidebar. No OrbitBrand, no OrbitMark. It was intentionally removed.

There are **no left-edge accent indicators** on active items. Active state is communicated through brighter text only, matching Codex.

### Thread History

- Section header: `text-[12px] font-medium text-white/40`
- Thread rows: `text-[12px]` title + `text-[11px] text-white/28` metadata
- Empty state: "No threads" in `text-[12px] text-white/30`
- Collapsible via chevron toggle

---

## Main Content Surface

```css
.app-main-surface {
  background: linear-gradient(180deg, rgba(30, 31, 35, 0.96), rgba(26, 27, 30, 0.98)), var(--app-bg);
}
```

This reads as a warm charcoal gray — NOT pure black, NOT blue-tinted. It's the Codex-like neutral dark workspace.

Ambient overlays in `App.tsx` add subtle atmosphere:
- Faint white gradient at top (`from-white/4`)
- Soft blue bloom top-right (`bg-[#4f63ff]/10 blur-3xl`)
- Very faint teal bloom bottom-left (`bg-teal-400/5 blur-3xl`)

---

## Welcome Screen

### Layout

```
flex column, full height
├── Hero area (flex-1, centered vertically)
│   ├── SpiralAnimation (160px canvas, rounded-full)
│   ├── "Orbit" (36px, semibold, white)
│   └── "ai, free for all" (28px, white/45)
├── [Suggestion cards — currently commented out, may return]
└── ChatInput (shrink-0, pinned to bottom)
```

### Key Details

- The animated spiral (`SpiralAnimation.tsx`) is a GSAP-driven canvas rendering white particles on a transparent background. It replaces the old static OrbitMark.
- "Orbit" is the app name in large display text. "ai, free for all" is the tagline below in muted text.
- Suggestion cards exist in the code but are commented out. They may return later.
- The ChatInput sits at the very bottom with `pb-6`.

---

## Chat Input

The composer is intentionally **borderless and seamless**. It should feel like text flows naturally into the surface.

### CSS (`app-input-shell`)

```css
background: rgba(255, 255, 255, 0.022);
border: none;
backdrop-filter: blur(12px);
box-shadow: none;
outline: none;
```

All focus states (`focus-within`, `textarea:focus`, `textarea:focus-visible`) also have `border: none`, `outline: none`, `box-shadow: none`.

### Structure

```
rounded-[22px], px-4, py-3
├── Top row: model selector pill (left) + send button (right, appears on input)
├── Textarea: outline:none via inline style, bg-transparent, text-[13px]
└── Bottom row: "Attach files by drag-and-drop" / "Enter to send"
```

The textarea also has inline `style={{ outline: 'none', boxShadow: 'none' }}` to override the global `:focus-visible` blue outline.

---

## Chat Screen

### Layout

```
flex column, flex-1, min-h-0
├── Messages area (flex-1, overflow-y-auto, px-6, pt-2, pb-6)
│   ├── Conversation header (title + model pill)
│   └── Message list (max-w-[640px], gap-5)
└── ChatInput (shrink-0, pinned bottom)
```

### Message Pattern

- No bubbles. Left-aligned stacked layout.
- 20px avatar circle
- Muted label above body ("You" / model name)
- Timestamp in mono below
- Code blocks in inset dark cards with rounded corners

---

## Model Library

### Layout

```
overflow-y-auto, px-6, pt-2, pb-6
├── Heading ("Model Library") + subtitle
├── Featured model card (LiquidGradient background)
├── Filter pills row
└── Regular model cards (1/2/3 column grid)
```

### Featured Card

The featured card uses a **live Three.js liquid gradient** (`LiquidGradient.tsx`) as its background. It is NOT the old `app-premium-card` CSS gradient.

```
rounded-[28px], overflow-hidden, min-height 160px
├── LiquidGradient (absolute inset-0, interactive WebGL canvas)
└── Content overlay (relative z-10, flex justify-end, p-5)
    ├── Model name (16px semibold) + params/size (12px mono)
    ├── Description (12px, white/68)
    └── Download button or Ready badge
```

The liquid gradient is interactive — mouse movement creates touch ripple distortion. Colors are dark navy + warm orange.

**No category tags. No bottom border. No `app-premium-card` class.**

### Regular Cards

```
app-card app-card-hover, rounded-[22px], p-4
├── Download button or Ready badge (top right)
├── Model name (14px semibold) + params/size (12px mono)
└── Description (12px, white/44, line-clamp-3)
```

**No category tags ("chat", "code", "creative" pills were removed).**

### Filter Pills

```
Active: bg-white text-stone-900 font-medium, rounded-full
Inactive: border border-white/8 bg-white/4 text-white/46, rounded-full
```

---

## MCP Tools Screen

Standard glass cards in a 2-column grid. Each card has:
- Icon tile (9x9 rounded-2xl) + tool name + toggle switch
- Description text
- Status dot (blue when connected, animation pulse)
- Config disclosure panel (expandable, inset dark code block)
- Connected cards get a blue left-edge inset shadow

---

## Hardware Audit Screen

Three states: idle, scanning, results.

- **Idle:** centered icon + heading + "Start Scan" white pill button
- **Scanning:** OrbitPulse animation + percentage counter
- **Results:** System profile cards (2-col grid) + model compatibility list rows

---

## Shared Surface Classes

All defined in `src/index.css`. Use these instead of inventing new treatments.

| Class | Usage |
|-------|-------|
| `app-shell` | Root app container with ambient gradients |
| `app-main-surface` | Main content area (warm charcoal) |
| `app-sidebar` | Frosted blue-gray sidebar |
| `app-card` | Standard glass card (dark panel, border, blur, shadow) |
| `app-card-hover` | Add to interactive cards for hover transitions |
| `app-glass-pill` | Translucent pills and chips |
| `app-input-shell` | Borderless chat composer surface |
| `app-divider` | Subtle border color for dividers |

The `app-premium-card` class still exists in CSS but is **no longer used** for the featured model card. The featured card now uses `LiquidGradient.tsx` directly.

---

## Border Radius

| Radius | Usage |
|--------|-------|
| `rounded-full` | pills, avatars, buttons, circular controls |
| `rounded-lg` | sidebar nav items |
| `rounded-md` | small inner containers |
| `rounded-xl` | icon containers |
| `rounded-2xl` | dropdowns, tool icon tiles |
| `rounded-[18px]` | list-row cards |
| `rounded-[20px]` | suggestion cards (when enabled) |
| `rounded-[22px]` | standard glass cards, composer shell |
| `rounded-[28px]` | featured card with liquid gradient |

---

## Shadows

Do NOT use Tailwind shadow utilities. Use explicit `box-shadow` values:

- Standard glass card: `0 18px 60px rgba(0, 0, 0, 0.28)`
- Hovered glass card: `0 22px 60px rgba(0, 0, 0, 0.36)`
- Dropdowns: `0 20px 50px rgba(0, 0, 0, 0.4)`
- Toggle thumb: `0 1px 2px rgba(0,0,0,0.1)`
- Sidebar: **none** (frosted glass, no shadow)
- Input shell: **none** (borderless, no shadow)

---

## Icons

All icons come from `lucide-react`. No exceptions.

- Nav icons: `18px` (`h-[18px] w-[18px]`)
- Standard inline: `16px` (`h-4 w-4`)
- Small: `14px` (`h-3.5 w-3.5`)
- Always: `strokeWidth={1.5}`

---

## Motion

### Allowed

- Page fade transitions (150-200ms, ease-in-out)
- Dropdown fade + slight Y motion (150ms)
- Hover transitions on interactive cards (150ms)
- Toggle thumb animation (150ms)
- Progress bar width animation
- SpiralAnimation (GSAP canvas, welcome screen only)
- LiquidGradient (Three.js WebGL, featured card only)
- OrbitPulse (scanning indicator)
- Streaming cursor blink

### Forbidden

- Staggered card entrances
- Large spring animations
- Bouncy buttons
- Parallax
- Decorative floating effects

`prefers-reduced-motion` is handled globally in `src/index.css`.

---

## Special Components

### SpiralAnimation (`src/components/SpiralAnimation.tsx`)

GSAP-powered canvas that renders a white particle spiral on transparent background. Used as the Orbit logo on the welcome screen.

- Accepts `size` prop (default 160px)
- Handles DPR for Retina crispness
- Cleans up timeline on unmount
- Dependencies: `gsap`

### LiquidGradient (`src/components/LiquidGradient.tsx`)

Three.js WebGL shader that renders an interactive liquid gradient. Used as the featured model card background.

- Renders as `absolute inset-0` to fill parent
- Interactive mouse touch distortion
- Dark navy + warm orange color scheme with grain
- Uses ResizeObserver for container sizing
- Dependencies: `three`

---

## File Reference

| File | Responsibility |
|------|----------------|
| `src/index.css` | Global tokens, reusable surface classes, animation keyframes |
| `src/App.tsx` | Shell composition, ambient overlays, screen transitions, top spacing |
| `src/components/Sidebar.tsx` | Frosted sidebar nav rail + thread history |
| `src/components/ChatInput.tsx` | Borderless composer |
| `src/components/ChatMessage.tsx` | Message presentation |
| `src/components/ModelCard.tsx` | Regular + featured (liquid gradient) model cards |
| `src/components/SpiralAnimation.tsx` | GSAP canvas spiral for welcome screen |
| `src/components/LiquidGradient.tsx` | Three.js liquid gradient for featured card |
| `src/components/OrbitPulse.tsx` | Scanning/thinking indicator |
| `src/components/GrainFilter.tsx` | SVG grain filter |
| `src/screens/Welcome.tsx` | Hero welcome with spiral + chat input |
| `src/screens/Chat.tsx` | Conversation layout |
| `src/screens/ModelLibrary.tsx` | Featured model + grid |
| `src/screens/MCPTools.tsx` | Tool management cards |
| `src/screens/HardwareAudit.tsx` | Scanning flow + results |

---

## Checklist For Future UI Work

Before shipping any new screen or component, verify ALL of these:

- [ ] Uses the dark charcoal surface, not light or pure black
- [ ] Reuses `app-card`, `app-input-shell`, `app-glass-pill`, or another shared class
- [ ] Uses explicit pixel text sizes (`text-[13px]` not `text-sm`)
- [ ] Uses Lucide icons with `strokeWidth={1.5}`
- [ ] Uses white/stone text hierarchy on dark backgrounds
- [ ] Has NO emoji anywhere
- [ ] Has NO decorative Unicode separators
- [ ] Has NO entrance animations on cards or lists
- [ ] Has NO visible border or outline on input fields
- [ ] Has NO category tags on model cards
- [ ] Has NO brand logo in the sidebar
- [ ] Has proper top spacing (content starts 84px+ from window top)
- [ ] Chat input remains borderless in all focus states
- [ ] Primary actions use white pill buttons
- [ ] The featured card treatment uses LiquidGradient, not CSS gradients
- [ ] New surfaces feel like they belong in the Codex desktop app
