# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orbit is a macOS desktop application for managing local AI model conversations, hardware compatibility auditing, and MCP tool integrations. Built with Electron + React + TypeScript.

## Commands

All commands run from the `orbit/` directory:

```bash
cd orbit

npm run dev              # Vite dev server on http://localhost:5173
npm run dev:electron     # Vite + Electron together (waits for Vite before launching Electron)
npm run build            # TypeScript type-check + Vite production build
npm run build:electron   # Full Electron app build (produces macOS DMG in release/)
npm run lint             # ESLint (flat config, v9+)
npm run preview          # Preview production build locally
```

No test framework is configured. There are no test scripts or test files.

## Architecture

### Screen-based Navigation

`App.tsx` routes between 5 screens using a `currentScreen` string state: `'welcome'` | `'chat'` | `'hardware'` | `'models'` | `'tools'`. Screen transitions use Framer Motion. There is no router library — navigation is handled via `useAppState().navigateTo()`.

### State Management

All app state lives in `src/hooks/useAppState.ts` — a single custom hook using `useState`. It manages conversations, models, MCP tools, sidebar state, and the active screen. State is initialized from mock data in `src/data/mock.ts`. There is no backend; all data is in-memory with mock responses.

### Key Directories

- `src/screens/` — Full-page views (Welcome, Chat, HardwareAudit, ModelLibrary, MCPTools)
- `src/components/` — Reusable UI (Sidebar, ChatInput, ChatMessage, ModelCard)
- `src/hooks/` — useAppState (central state), useKeyboardNav (Cmd+N/B/1-5 shortcuts)
- `src/data/mock.ts` — All mock data: models, conversations, MCP tools, suggestions
- `electron/` — Main process (`main.ts`/`main.cjs`) and preload scripts

### Electron Setup

- Window: 1280x820, min 900x600, `hiddenInset` title bar (macOS)
- Context isolation enabled, node integration disabled
- Dev mode loads localhost:5173; prod loads `dist/index.html`
- Compiled Electron files use `.cjs` extension

### Styling & Design System

**IMPORTANT:** All UI work MUST follow `orbit/DESIGN.md` — the single source of truth for Orbit's visual design. Read it ENTIRELY before touching any component, screen, or style. It defines every color, font size, spacing value, border radius, shadow, animation, and component pattern used in the app.

The visual reference is **OpenAI Codex desktop app**. Key rules:

- **Warm charcoal workspace** — not pure black, not blue-tinted. `rgba(30,31,35)` range
- **Frosted blue-gray sidebar** — translucent with `backdrop-filter: blur(24px)`, 260px wide
- **No brand logo in sidebar** — removed intentionally, do not re-add
- **Borderless chat input** — `border: none`, `outline: none`, `box-shadow: none` in ALL states
- **No category tags on model cards** — no "chat"/"code"/"creative" pills
- **84px top spacing** — content starts well below window top (drag region + wrapper padding)
- **Featured card uses LiquidGradient** — live Three.js WebGL shader, not CSS gradients
- **Welcome screen uses SpiralAnimation** — GSAP canvas particle spiral as logo
- **Shared surface classes** — `app-card`, `app-card-hover`, `app-input-shell`, `app-glass-pill` from `src/index.css`
- **Explicit pixel font sizes** — `text-[13px]` not `text-sm`
- **Large display text on welcome** — 36px headline, 28px subtitle
- **No Tailwind shadows** — use inline `boxShadow` with specific values
- **No entrance animations** on cards or lists
- **Icons: Lucide, strokeWidth 1.5** — never strokeWidth 2
- **No emoji or decorative Unicode in UI copy**

If this summary and `orbit/DESIGN.md` ever disagree, follow `orbit/DESIGN.md`.

Tailwind CSS v4 (imported via `@import "tailwindcss"` in `index.css`). Custom system font stack (`-apple-system`, `SF Pro Text`). Custom scrollbar styles and a `.drag-region` class for Electron window dragging.

### TypeScript Config

Two tsconfig files referenced by the root `tsconfig.json`:
- `tsconfig.app.json` — ES2022 target, strict mode, covers `src/`
- `tsconfig.node.json` — ES2023 target, covers `vite.config.ts`
