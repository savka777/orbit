# Orbit UI Redesign - Design Document

**Date**: 2026-03-07
**Approach**: Swiss Precision + Frosted Native Hybrid
**Inspiration**: Linear, Raycast, Claude.ai

## Overview

Complete UI overhaul of the Orbit macOS desktop app. Strip away visual noise, generic AI aesthetics, and bulky components. Replace with a tight, warm, information-dense interface that feels like a native macOS power-user tool.

## Design Principles

1. Every pixel earns its place. Zero decoration.
2. Content-first. The UI disappears so the content shines.
3. Warm and approachable, not cold and clinical.
4. Functional motion only. No animation for animation's sake.
5. Selective premium moments (cloud gradient cards) amid consistent restraint.

---

## 1. Color System - Warm Stone Palette

```css
:root {
  --white:         #ffffff;
  --warm-50:       #fafaf9;    /* stone-50, secondary backgrounds */
  --warm-100:      #f5f5f4;    /* stone-100, hover states */
  --warm-200:      #e7e5e4;    /* stone-200, borders, dividers */
  --warm-300:      #d6d3d1;    /* stone-300, stronger borders */
  --warm-400:      #a8a29e;    /* stone-400, disabled/placeholders */
  --warm-500:      #78716c;    /* stone-500, secondary text */
  --warm-700:      #44403c;    /* stone-700, strong secondary */
  --warm-900:      #1c1917;    /* stone-900, primary text */

  --accent:        #0d9488;    /* teal-600, used sparingly */
  --accent-subtle: #f0fdfa;    /* teal-50, subtle accent fills */

  --success:       #22c55e;    /* green-500 */
  --warning:       #f59e0b;    /* amber-500 */
  --error:         #ef4444;    /* red-500 */
}
```

No gradients on regular surfaces. No shadows on cards. Depth comes from borders and background color shifts only. Status colors used for semantic meaning only.

---

## 2. Typography

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  --font-mono: 'SF Mono', ui-monospace, 'JetBrains Mono', monospace;
}
```

### Type Scale

| Size | Weight | Use |
|------|--------|-----|
| 11px | medium | Tertiary labels, timestamps, badges, tags |
| 12px | normal | Secondary text, descriptions, card body |
| 13px | normal | Body text (DEFAULT), assistant messages |
| 13px | medium | Emphasized body, nav labels, user messages |
| 14px | semibold | Section headings |
| 18px | semibold | Page titles (rare) |

- Line-height: 1.7 for body, 1.4 for UI text, 1.2 for headings
- Letter-spacing: -0.01em for headings, normal for body
- Monospace: model names, parameter counts, file sizes, code blocks, config snippets

---

## 3. Spacing System

4px base grid:

| Token | Value | Use |
|-------|-------|-----|
| space-0.5 | 2px | Micro gaps (icon-to-text inline) |
| space-1 | 4px | Tight padding (badges, pills) |
| space-1.5 | 6px | Small padding (compact buttons, pill filter padding) |
| space-2 | 8px | Standard gap between elements |
| space-3 | 12px | Padding inside cards/inputs |
| space-4 | 16px | Section spacing |
| space-6 | 24px | Major section breaks |
| space-8 | 32px | Page-level padding |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| radius-sm | 4px | Buttons, inputs, badges, tags |
| radius-md | 6px | Regular cards, panels |
| radius-lg | 8px | Featured cards, modals, popovers |

---

## 4. Layout & Navigation

### Sidebar - Minimal Icon Rail

```
Default width:  48px (icon-only)
Expanded width: 220px (hover or pinned)
Background:     rgba(250, 250, 249, 0.8) + backdrop-blur-xl
Border-right:   1px solid var(--warm-200)
```

**Navigation icons** (Lucide, stroke-width 1.5, 18px):
- MessageSquare (Chat)
- Cpu (Hardware)
- Layers (Models)
- Plug (Tools)

**States**:
- Active: warm-900 icon, warm-100 pill bg (32px wide)
- Hover: warm-700 icon, warm-50 pill bg
- Inactive: warm-400 icon

**Expansion behavior**:
- Hover: 200ms delay before expanding
- Click chevron: pins open
- Recent conversations list visible when expanded
- Bottom: Orbit logo mark (16px) when collapsed, wordmark when expanded

### Main Content Area

- Full height minus 7px Electron drag region
- Background: #ffffff
- Chat: max-w-[640px] centered
- Grid screens: max-w-[960px] centered

---

## 5. Component Specifications

### Chat Messages

Both user and assistant messages are left-aligned with no bubbles or background colors. Document-like flow.

**User messages**:
- 13px font-medium, warm-900
- Avatar: 20px circle, warm-200 bg, warm-500 initial letter
- "You" label: 11px warm-400, inline with avatar

**Assistant messages**:
- 13px font-normal, warm-900, line-height 1.7
- Avatar: 20px Orbit icon, warm-300
- Model name: 11px mono warm-400 (e.g., "llama-3.3-70b")
- Code blocks: warm-50 bg, 1px warm-200 border, 12px mono

**Separator**: 20px vertical gap between messages, no lines

### Orbit Pulse - Thinking Animation

Signature thinking indicator instead of generic dots/spinner:

- A thin (1.5px) circular ring (24px) in warm-300
- A small dot (4px, teal-500) orbits around the ring in 1.5s (linear, infinite)
- The dot leaves a subtle conic-gradient trail
- The ring gently pulses scale (1.0 -> 1.05 -> 1.0) on a 2s ease-in-out cycle
- "Thinking..." text: 12px warm-400, italic, to the right
- On completion: ring dissolves (opacity 0, 200ms), response text fades in

### Streaming State

- Text streams token-by-token
- Thin blinking cursor: 2px wide, warm-900
- `@keyframes blink { 50% { opacity: 0 } }` at 500ms step-end
- Cursor disappears when streaming completes

### Chat Input

```
Container: max-w-[640px] centered, 12px padding
Border:    1px solid var(--warm-200), radius 6px
Focus:     border-color var(--warm-300)
Background: white
```

Layout:
```
┌──────────────────────────────────────┐
│ [model pill]                    [->] │
│ Ask Orbit anything...                │
└──────────────────────────────────────┘
```

- Model pill: 11px mono, warm-500 text, warm-100 bg, radius 4px, chevron-down 12px
- Send button: 24x24px, warm-900 bg, white arrow, radius 4px, scale 0.95 on press
- Send button only visible when text is entered
- No attachment or mic buttons (simplify)

### Buttons

| Type | Background | Border | Text | Padding |
|------|-----------|--------|------|---------|
| Primary | warm-900 | none | white, 13px medium | 6px 12px |
| Secondary | white | 1px warm-200 | warm-700, 13px medium | 6px 12px |
| Ghost | transparent | none | warm-500, 13px normal | 6px 12px |

All buttons: height 32px, radius 4px, cursor-pointer
- Hover (primary): warm-700 bg
- Hover (secondary): warm-50 bg
- Hover (ghost): warm-100 bg
- Active: scale 0.98, 150ms

### Filter Pills

- Active: warm-900 bg, white text, 11px font-medium
- Inactive: warm-100 bg, warm-500 text, 11px font-normal
- Hover: warm-200 bg, warm-700 text
- Height: 28px, radius 4px, padding 4px 10px, gap 6px

### Toggle Switches

- Track: 36x20px, radius 10px
- Off: warm-200 bg
- On: teal-500 bg
- Thumb: 16x16px white circle, subtle shadow
- Transition: 150ms ease

---

## 6. Card System

### Regular Cards

```css
.card {
  background: white;
  border: 1px solid var(--warm-200);
  border-radius: 6px;
  padding: 14px;
  transition: all 200ms ease;
}
.card:hover {
  border-color: var(--warm-300);
  background: var(--warm-50);
  box-shadow: 0 2px 12px rgba(28, 25, 23, 0.04);
}
```

Content layout:
- Tags (top-left) + action button (top-right)
- Name: 13px font-medium warm-900
- Specs: 12px mono warm-500 (e.g., "7B . 4.1 GB")
- Description: 12px warm-500, 2-line clamp
- Download progress: 2px teal-400 bar at card bottom

### Featured / Cloud Gradient Cards

Premium card variant for featured elements. Uses layered radial gradients with SVG noise overlay.

```css
.card-featured {
  position: relative;
  border: none;
  border-radius: 8px;
  padding: 16px;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(153, 246, 228, 0.3), transparent 70%),
    radial-gradient(ellipse at 80% 20%, rgba(254, 205, 211, 0.25), transparent 70%),
    radial-gradient(ellipse at 50% 80%, rgba(254, 243, 199, 0.2), transparent 70%),
    #ffffff;
  overflow: hidden;
}
.card-featured::after {
  content: '';
  position: absolute;
  inset: 0;
  filter: url(#grain);
  opacity: 0.06;
  mix-blend-mode: overlay;
  border-radius: inherit;
  pointer-events: none;
}
```

SVG noise filter (added once to the page):
```html
<svg width="0" height="0" style="position:absolute">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
</svg>
```

Cloud gradient variants:
- **Aurora**: teal -> rose -> cream (default featured)
- **Dusk**: slate -> lavender -> rose
- **Dawn**: amber -> peach -> pink
- **Mist**: stone -> cool gray -> warm white (subtle, for welcome hero)

Usage:
- Featured model card in Model Library
- Welcome screen hero background (mist variant)
- NOT on every card - most stay clean white

### MCP Tool Cards

Disconnected: regular card style, warm-200 toggle track

Connected:
```css
.tool-connected {
  border-color: rgba(13, 148, 136, 0.2);
  box-shadow: inset 3px 0 0 rgba(13, 148, 136, 0.3);
}
```
- Toggle: teal-500 track, white thumb
- Status dot: teal-500, subtle pulse animation (2s)

### Hardware Results Cards

- Regular card style for spec items
- Status dots: 3px circles (green/amber/red)
- Compatibility badges:
  - Full: teal-50 bg, teal-700 text
  - Partial: amber-50 bg, amber-700 text
  - Limited: warm-100 bg, warm-500 text

---

## 7. Motion & Animation

### Philosophy

Functional, not decorative. Inspired by Linear: every animation serves orientation or feedback.

### Timing

| Category | Duration | Easing |
|----------|----------|--------|
| Micro-interactions | 150ms | ease (hover, press, toggle) |
| Panel transitions | 200ms | ease-in-out (sidebar) |
| Screen transitions | 200ms | ease (opacity fade) |
| Spring animations | stiffness 300, damping 30 | Framer Motion |

### What Gets Animated

- Screen transitions (opacity fade)
- Sidebar expand/collapse (width + content opacity)
- Card hover states (border-color, shadow, bg)
- Toggle switches (thumb position, track color)
- Download progress bars (width)
- Orbit Pulse thinking animation
- Streaming cursor blink

### What Does NOT Get Animated

- No staggered children on page load
- No card entrance animations
- No bounce/spring on buttons
- No scale transforms that shift layout
- No parallax or scroll effects

### Accessibility

`prefers-reduced-motion`: all animations disabled except opacity transitions.

---

## 8. Screen Specifications

### Welcome Screen

Centered, vertically balanced layout:
- Orbit logo: 24px, warm-300
- Heading: "What would you like to explore?" 18px semibold
- Suggestion cards: 2-column grid, regular card style (compact, 10px padding)
  - Icon (16px, warm-400) + text (12px, warm-600)
- Chat input at bottom
- Background: subtle mist cloud gradient (optional)

### Chat Screen

- No header bar (model info in input area)
- Messages in max-w-[640px] centered column
- Auto-scroll on new messages
- Chat input pinned to bottom

### Model Library

- Title: "Model Library" 14px semibold
- Subtitle: 12px warm-500
- Featured card: cloud gradient variant at top
- Filter pills row
- Model grid: 3 columns on xl, 2 on lg, 1 on mobile

### Hardware Audit

- Three states: idle -> scanning -> results
- Idle: Cpu icon + "Scan Your Hardware" button
- Scanning: Orbit Pulse (40px) + progress percentage
- Results: system profile heading + spec cards grid + compatibility list

### MCP Tools

- Title + connected count badge (teal-50 bg, teal-700 text)
- Tool grid: 2 columns on lg, 1 on mobile
- Connected tools have teal left-edge glow
- Config sections: collapsible, mono 12px, warm-50 bg

---

## 9. Skills & Tools for Implementation

| Skill | Role |
|-------|------|
| interface-design | Primary design system enforcement, token persistence |
| ui-ux-pro-max | Design intelligence, palette/font validation |
| frontend-design | Anti-slop aesthetic direction |
| ui-design-system | Design token generation |
| mobile-design | Touch target and responsive patterns |
