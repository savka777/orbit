# Orbit UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completely overhaul Orbit's UI from generic AI chat aesthetic to a Swiss Precision + Frosted Native hybrid inspired by Linear and Raycast.

**Architecture:** Bottom-up approach. Start with the CSS foundation (colors, typography, spacing), then restyle each component one at a time, then update each screen. No structural changes to state management or routing — this is purely visual.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Framer Motion, Lucide icons. No new dependencies.

**Design doc:** `docs/plans/2026-03-07-ui-redesign-design.md`

---

### Task 1: CSS Foundation — Color, Typography, Spacing, Animations

**Files:**
- Modify: `orbit/src/index.css`

**Step 1: Replace the entire index.css with the new design system foundation**

```css
@import "tailwindcss";

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  --font-mono: 'SF Mono', ui-monospace, 'JetBrains Mono', monospace;
}

html, body, #root {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: var(--font-sans);
  background: #FFFFFF;
  color: #1c1917;
  font-size: 13px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar - warm stone */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #d6d3d1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #a8a29e;
}

/* Drag region for Electron title bar */
.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}

/* Focus ring - teal accent */
:focus-visible {
  outline: 2px solid rgba(13, 148, 136, 0.5);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Orbit Pulse - thinking animation */
@keyframes orbit-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes orbit-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes blink-cursor {
  50% { opacity: 0; }
}
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 2: Verify the dev server still works**

Run: `cd orbit && npm run dev`
Expected: Vite starts on localhost:5173, no CSS errors in console

**Step 3: Commit**

```bash
git add orbit/src/index.css
git commit -m "style: replace CSS foundation with warm stone palette and new animations"
```

---

### Task 2: SVG Grain Filter Component

**Files:**
- Create: `orbit/src/components/GrainFilter.tsx`

**Step 1: Create the SVG noise filter component**

This SVG filter is rendered once in the app and referenced by cloud gradient cards via `filter: url(#grain)`.

```tsx
export default function GrainFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
    </svg>
  )
}
```

**Step 2: Add GrainFilter to App.tsx**

In `orbit/src/App.tsx`, import and render `<GrainFilter />` at the top of the JSX return, before the flex container:

```tsx
import GrainFilter from './components/GrainFilter'

// In the return, add as first child:
return (
  <>
    <GrainFilter />
    <div className="flex h-full w-full overflow-hidden bg-white">
      {/* ... existing content ... */}
    </div>
  </>
)
```

**Step 3: Verify no visual change yet**

Run: `cd orbit && npm run dev`
Expected: App renders identically. The SVG filter is invisible until referenced.

**Step 4: Commit**

```bash
git add orbit/src/components/GrainFilter.tsx orbit/src/App.tsx
git commit -m "feat: add SVG grain noise filter for cloud gradient cards"
```

---

### Task 3: Orbit Pulse Component — Thinking Animation

**Files:**
- Create: `orbit/src/components/OrbitPulse.tsx`

**Step 1: Create the OrbitPulse component**

```tsx
type OrbitPulseProps = {
  size?: number
  label?: string
}

export default function OrbitPulse({ size = 24, label = 'Thinking...' }: OrbitPulseProps) {
  const dotSize = Math.round(size / 6)
  const ringRadius = size / 2

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1.5px solid #d6d3d1',
            animation: 'orbit-pulse 2s ease-in-out infinite',
          }}
        />
        {/* Orbiting dot */}
        <div
          className="absolute"
          style={{
            width: size,
            height: size,
            animation: 'orbit-spin 1.5s linear infinite',
          }}
        >
          <div
            className="rounded-full bg-teal-500"
            style={{
              width: dotSize,
              height: dotSize,
              position: 'absolute',
              top: 0,
              left: ringRadius - dotSize / 2,
            }}
          />
        </div>
      </div>
      {label && (
        <span className="text-xs italic text-stone-400">
          {label}
        </span>
      )}
    </div>
  )
}
```

**Step 2: Verify component renders**

Temporarily import into Welcome.tsx and render `<OrbitPulse />` to visually verify the animation works. Remove after confirming.

**Step 3: Commit**

```bash
git add orbit/src/components/OrbitPulse.tsx
git commit -m "feat: add OrbitPulse thinking animation component"
```

---

### Task 4: Sidebar Redesign — Minimal Icon Rail

**Files:**
- Modify: `orbit/src/components/Sidebar.tsx`

**Step 1: Rewrite the Sidebar component**

Replace the entire Sidebar.tsx with the new 48px icon rail design. Key changes:
- Width: 48px collapsed (was 64px), 220px expanded (was 260px)
- Background: frosted glass (`bg-stone-50/80 backdrop-blur-xl`)
- Icons: 18px at stroke-width 1.5 (was 20px at stroke-width 2)
- Replace `Library` icon with `Layers` icon
- Active state: warm-900 icon with warm-100 pill bg
- Inactive: warm-400 icon
- Remove logo hover rotation animation
- Logo: 16px Orbit icon at bottom when collapsed
- Remove "New Chat" button text when collapsed (icon only)
- Recent conversations: 12px text, tighter padding
- Toggle button: cleaner, no border-t, just sits at bottom

The full replacement component:

```tsx
import { useState, useCallback } from 'react'
import {
  Orbit,
  SquarePen,
  MessageSquare,
  Cpu,
  Layers,
  Plug,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type SidebarProps = {
  currentScreen: 'welcome' | 'chat' | 'hardware' | 'models' | 'tools'
  conversations: Array<{ id: string; title: string; timestamp: string; model: string }>
  activeConversationId: string | null
  collapsed: boolean
  onNavigate: (screen: 'welcome' | 'chat' | 'hardware' | 'models' | 'tools') => void
  onOpenConversation: (id: string) => void
  onNewChat: () => void
  onToggleCollapse: () => void
}

const navItems = [
  { screen: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  { screen: 'hardware' as const, icon: Cpu, label: 'Hardware' },
  { screen: 'models' as const, icon: Layers, label: 'Models' },
  { screen: 'tools' as const, icon: Plug, label: 'Tools' },
]

export default function Sidebar({
  currentScreen,
  conversations,
  activeConversationId,
  collapsed,
  onNavigate,
  onOpenConversation,
  onNewChat,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <div
      className="h-full flex flex-col border-r border-stone-200 bg-stone-50/80 backdrop-blur-xl transition-all duration-200 ease-in-out"
      style={{
        width: collapsed ? 48 : 220,
        minWidth: collapsed ? 48 : 220,
      }}
    >
      {/* Drag region */}
      <div className="drag-region h-7 w-full shrink-0" />

      {/* New Chat button */}
      <div className={`shrink-0 ${collapsed ? 'px-1.5 pb-3' : 'px-2.5 pb-3'}`}>
        <button
          onClick={onNewChat}
          className={`no-drag flex items-center justify-center gap-2 w-full rounded py-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors duration-150 cursor-pointer ${
            collapsed ? 'px-0' : 'px-2'
          }`}
        >
          <SquarePen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
          {!collapsed && (
            <span className="text-[13px] font-medium">New Chat</span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex flex-col gap-0.5 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        {navItems.map(({ screen, icon: Icon, label }) => {
          const active = currentScreen === screen
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className={`no-drag relative flex items-center gap-2.5 rounded py-1.5 text-[13px] transition-colors duration-150 cursor-pointer ${
                collapsed ? 'justify-center px-0' : 'px-2'
              } ${
                active
                  ? 'bg-stone-100 text-stone-900 font-medium'
                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
              {!collapsed && <span>{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Recent conversations */}
      {!collapsed && (
        <div className="mt-4 flex flex-1 flex-col overflow-hidden px-2">
          <span className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Recent
          </span>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onOpenConversation(conv.id)}
                className={`no-drag flex w-full flex-col rounded px-2 py-1.5 text-left transition-colors duration-150 cursor-pointer ${
                  activeConversationId === conv.id
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                <span className="truncate text-[12px]">{conv.title}</span>
                <span className="truncate text-[11px] text-stone-400 mt-0.5">
                  {conv.timestamp}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spacer when collapsed */}
      {collapsed && <div className="flex-1" />}

      {/* Bottom: Logo + collapse toggle */}
      <div className={`shrink-0 p-2 flex flex-col items-center gap-1 ${collapsed ? '' : 'border-t border-stone-200'}`}>
        {collapsed && (
          <Orbit className="h-4 w-4 text-stone-300 mb-1" strokeWidth={1.5} />
        )}
        <button
          onClick={onToggleCollapse}
          className="no-drag flex w-full items-center justify-center rounded py-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors duration-150 cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Verify sidebar renders correctly in both states**

Run: `cd orbit && npm run dev`
Expected: 48px icon rail, frosted glass background, 18px icons, teal-style accents on active state. Click toggle to expand to 220px with labels and conversations list.

**Step 3: Commit**

```bash
git add orbit/src/components/Sidebar.tsx
git commit -m "style: redesign sidebar as minimal 48px icon rail with frosted glass"
```

---

### Task 5: ChatInput Redesign

**Files:**
- Modify: `orbit/src/components/ChatInput.tsx`

**Step 1: Rewrite ChatInput**

Key changes from current:
- Remove Paperclip and Mic buttons (simplify)
- Model selector becomes a pill badge (11px mono, stone-100 bg)
- Input container: 1px stone-200 border, radius 6px (was rounded-xl), 12px padding
- Remove the inner border-t divider
- Send button: 24x24px, stone-900 bg, white ArrowUp, radius 4px (was rounded-full)
- Model dropdown: radius 6px (was rounded-xl), tighter padding
- Font sizes down: 13px textarea, 11px model pill

Full replacement:

```tsx
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowUp, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type ChatInputProps = {
  onSend: (content: string) => void
  selectedModel: { id: string; name: string; parameterCount: string }
  downloadedModels: Array<{ id: string; name: string; parameterCount: string }>
  onSelectModel: (modelId: string) => void
}

export default function ChatInput({
  onSend,
  selectedModel,
  downloadedModels,
  onSelectModel,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 4 * 24
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [input])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full px-6 pb-4">
      <div className="max-w-[640px] mx-auto">
        <div className="bg-white border border-stone-200 rounded-md p-3 transition-colors focus-within:border-stone-300">
          {/* Top row: model pill + send */}
          <div className="flex items-center justify-between mb-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-[11px] font-mono text-stone-500 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                {selectedModel.name} {selectedModel.parameterCount}
                <ChevronDown className="w-3 h-3" />
              </button>

              <AnimatePresence>
                {modelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-stone-200 rounded-md overflow-hidden z-50"
                    style={{ boxShadow: '0 4px 16px rgba(28, 25, 23, 0.08)' }}
                  >
                    {downloadedModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onSelectModel(model.id)
                          setModelDropdownOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-50 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-stone-700">{model.name}</div>
                          <div className="text-[11px] font-mono text-stone-400">{model.parameterCount}</div>
                        </div>
                        {model.id === selectedModel.id && (
                          <Check className="w-3.5 h-3.5 text-stone-900 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {input.trim().length > 0 && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleSend}
                  className="flex items-center justify-center w-6 h-6 rounded bg-stone-900 hover:bg-stone-700 transition-colors cursor-pointer active:scale-95"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-white" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Orbit anything..."
            rows={1}
            className="w-full bg-transparent text-stone-900 placeholder-stone-400 resize-none outline-none text-[13px] leading-6"
          />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify input renders correctly**

Run: `cd orbit && npm run dev`
Expected: Compact input with model pill top-left, send button top-right (appears when typing), no mic/paperclip buttons. 6px radius, stone borders.

**Step 3: Commit**

```bash
git add orbit/src/components/ChatInput.tsx
git commit -m "style: redesign ChatInput with model pill and compact layout"
```

---

### Task 6: ChatMessage Redesign

**Files:**
- Modify: `orbit/src/components/ChatMessage.tsx`

**Step 1: Rewrite ChatMessage**

Key changes:
- Remove right-alignment for user messages — everything left-aligned
- Remove bubbles (no bg-gray-100 for user, no rounded-2xl)
- Add avatar circles: 20px with initial for user, Orbit icon for assistant
- Streaming: blinking 2px cursor instead of pulsing block
- Code blocks: stone-50 bg, 1px stone-200 border, 12px mono
- No entrance animation (remove motion.div wrapper)
- Line-height 1.7 for assistant, 1.4 for user

```tsx
import { useState, useEffect } from 'react'
import { Orbit } from 'lucide-react'

type ChatMessageProps = {
  role: 'user' | 'assistant'
  content: string
  model?: string
  timestamp: string
  isStreaming?: boolean
}

function renderContent(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3)
      const newlineIndex = inner.indexOf('\n')
      const code = newlineIndex !== -1 ? inner.slice(newlineIndex + 1) : inner
      return (
        <pre
          key={i}
          className="bg-stone-50 border border-stone-200 rounded-md p-3 font-mono text-[12px] overflow-x-auto my-2"
        >
          <code className="text-stone-800">{code}</code>
        </pre>
      )
    }
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part}
      </span>
    )
  })
}

export default function ChatMessage({
  role,
  content,
  model,
  timestamp,
  isStreaming = false,
}: ChatMessageProps) {
  const [displayedLength, setDisplayedLength] = useState(isStreaming ? 0 : content.length)

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(content.length)
      return
    }

    setDisplayedLength(0)
    const interval = setInterval(() => {
      setDisplayedLength((prev) => {
        if (prev >= content.length) {
          clearInterval(interval)
          return content.length
        }
        return prev + 2
      })
    }, 12)

    return () => clearInterval(interval)
  }, [isStreaming, content])

  const visibleContent = isStreaming ? content.slice(0, displayedLength) : content
  const isUser = role === 'user'
  const showCursor = isStreaming && displayedLength < content.length

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center">
            <span className="text-[10px] font-medium text-stone-500">Y</span>
          </div>
        ) : (
          <div className="w-5 h-5 flex items-center justify-center">
            <Orbit className="w-4 h-4 text-stone-300" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Label */}
        <div className="text-[11px] text-stone-400 mb-0.5">
          {isUser ? 'You' : (
            <span className="font-mono">{model || 'assistant'}</span>
          )}
        </div>

        {/* Message body */}
        <div className={`text-[13px] text-stone-900 ${isUser ? 'font-medium leading-[1.4]' : 'leading-[1.7]'}`}>
          {renderContent(visibleContent)}
          {showCursor && (
            <span
              className="inline-block w-[2px] h-[1.1em] bg-stone-900 align-text-bottom ml-px"
              style={{ animation: 'blink-cursor 500ms step-end infinite' }}
            />
          )}
        </div>

        {/* Timestamp */}
        <div className="text-[11px] font-mono text-stone-400 mt-1">
          {timestamp}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify messages render correctly**

Run: `cd orbit && npm run dev`
Expected: Left-aligned messages with small avatars, no bubbles, blinking cursor during streaming, stone color scheme.

**Step 3: Commit**

```bash
git add orbit/src/components/ChatMessage.tsx
git commit -m "style: redesign ChatMessage with left-aligned no-bubble layout"
```

---

### Task 7: ModelCard Redesign with Cloud Gradient Featured Variant

**Files:**
- Modify: `orbit/src/components/ModelCard.tsx`

**Step 1: Rewrite ModelCard**

Key changes:
- Border: 1px stone-200 (was gray-200)
- Radius: 6px (was rounded-xl)
- Padding: 14px (was p-5/20px)
- Remove whileHover y:-2 animation
- Hover: border-stone-300, bg-stone-50, subtle shadow
- Tags: stone-100/stone-600 defaults, 11px, radius 4px (was rounded-full)
- Name: 13px font-medium (was text-lg font-semibold)
- Specs: 12px mono stone-500
- Download button: stone-900 bg, white text, radius 4px
- Progress bar: 2px teal-400 (was h-2 indigo-500)
- Ready badge: teal-50 bg, teal-700 text (was green)
- Add `featured` prop support for cloud gradient variant

```tsx
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'

type ModelCardProps = {
  model: {
    id: string
    name: string
    parameterCount: string
    size: string
    categories: string[]
    description: string
    downloaded: boolean
    featured?: boolean
  }
  downloadProgress?: number
  onDownload: (modelId: string) => void
  variant?: 'default' | 'featured'
}

function categoryStyle(category: string) {
  switch (category) {
    case 'code':
      return 'bg-sky-50 text-sky-700'
    case 'creative':
      return 'bg-violet-50 text-violet-700'
    default:
      return 'bg-stone-100 text-stone-600'
  }
}

export default function ModelCard({ model, downloadProgress, onDownload, variant = 'default' }: ModelCardProps) {
  const isDownloading = downloadProgress !== undefined && downloadProgress > 0 && !model.downloaded
  const isFeatured = variant === 'featured'

  return (
    <div
      className={`relative overflow-hidden transition-all duration-200 cursor-default ${
        isFeatured
          ? 'rounded-lg p-4'
          : 'rounded-md border border-stone-200 p-3.5 hover:border-stone-300 hover:bg-stone-50'
      }`}
      style={isFeatured ? {
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(153, 246, 228, 0.3), transparent 70%),
          radial-gradient(ellipse at 80% 20%, rgba(254, 205, 211, 0.25), transparent 70%),
          radial-gradient(ellipse at 50% 80%, rgba(254, 243, 199, 0.2), transparent 70%),
          #ffffff`,
        boxShadow: '0 2px 12px rgba(28, 25, 23, 0.04)',
      } : undefined}
    >
      {/* Grain overlay for featured */}
      {isFeatured && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            filter: 'url(#grain)',
            opacity: 0.06,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Content */}
      <div className="relative">
        {/* Top row: tags + action */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex flex-wrap gap-1">
            {model.categories.map((cat) => (
              <span
                key={cat}
                className={`rounded px-1.5 py-0.5 text-[11px] ${categoryStyle(cat)}`}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Action */}
          <div className="shrink-0 ml-3">
            {model.downloaded ? (
              <span className="rounded px-2 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-700">
                Ready
              </span>
            ) : isDownloading ? (
              <span className="text-[11px] font-mono text-stone-400">
                {downloadProgress}%
              </span>
            ) : (
              <button
                onClick={() => onDownload(model.id)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium bg-stone-900 text-white hover:bg-stone-700 transition-colors cursor-pointer active:scale-95"
              >
                <Download className="h-3 w-3" />
                Download
              </button>
            )}
          </div>
        </div>

        {/* Name + specs */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <h3 className="text-[13px] font-medium text-stone-900">{model.name}</h3>
          <span className="font-mono text-[12px] text-stone-500">
            {model.parameterCount} · {model.size}
          </span>
        </div>

        {/* Description */}
        <p className="text-[12px] leading-relaxed text-stone-500 line-clamp-2">
          {model.description}
        </p>

        {/* Download progress bar */}
        {isDownloading && (
          <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-stone-200">
            <motion.div
              className="h-full rounded-full bg-teal-400"
              animate={{ width: `${downloadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify card renders correctly**

Run: `cd orbit && npm run dev`, navigate to Models screen.
Expected: Compact cards with stone borders, 6px radius, tighter spacing. Featured variant not yet wired up (next task).

**Step 3: Commit**

```bash
git add orbit/src/components/ModelCard.tsx
git commit -m "style: redesign ModelCard with compact layout and cloud gradient variant"
```

---

### Task 8: Welcome Screen Redesign

**Files:**
- Modify: `orbit/src/screens/Welcome.tsx`

**Step 1: Rewrite Welcome screen**

Key changes:
- Orbit icon: 24px, stone-300 (was 48px, gray-400)
- Heading: 18px semibold (was text-2xl font-medium)
- Remove standalone model selector button (it's in ChatInput now)
- Suggestion cards: 10px padding, 1px stone-200 border, radius 6px
- Icons: 16px stone-400 (was 20px)
- Text: 12px stone-600 (was text-sm)
- Remove staggered entrance animation on cards
- 2-column grid for suggestions

```tsx
import { Orbit, FileText, Code, BarChart3 } from 'lucide-react'
import { suggestions } from '../data/mock'
import ChatInput from '../components/ChatInput'

type WelcomeProps = {
  onSend: (content: string) => void
  selectedModel: { id: string; name: string; parameterCount: string }
  downloadedModels: Array<{ id: string; name: string; parameterCount: string }>
  onSelectModel: (modelId: string) => void
  onSuggestionClick: (title: string) => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  FileText,
  Code,
  BarChart3,
}

export default function Welcome({
  onSend,
  selectedModel,
  downloadedModels,
  onSelectModel,
  onSuggestionClick,
}: WelcomeProps) {
  return (
    <div className="relative flex flex-col h-full w-full bg-white">
      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center mb-10">
          <Orbit className="w-6 h-6 text-stone-300 mb-4" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold text-stone-900 tracking-[-0.01em]">
            What would you like to explore?
          </h1>
        </div>

        {/* Suggestion cards */}
        <div className="grid grid-cols-2 gap-2 max-w-md w-full">
          {suggestions.map((suggestion) => {
            const Icon = iconMap[suggestion.icon]
            return (
              <button
                key={suggestion.title}
                onClick={() => onSuggestionClick(suggestion.title)}
                className="bg-white border border-stone-200 rounded-md px-3 py-2.5 text-left hover:bg-stone-50 hover:border-stone-300 transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  {Icon && <Icon className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" strokeWidth={1.5} />}
                  <span className="text-[12px] text-stone-600 leading-relaxed">
                    {suggestion.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat input */}
      <div className="pb-2">
        <ChatInput
          onSend={onSend}
          selectedModel={selectedModel}
          downloadedModels={downloadedModels}
          onSelectModel={onSelectModel}
        />
      </div>
    </div>
  )
}
```

**Step 2: Verify Welcome screen**

Run: `cd orbit && npm run dev`
Expected: Compact centered layout. 24px stone icon, 18px heading, 2-col suggestion grid, no entrance animations.

**Step 3: Commit**

```bash
git add orbit/src/screens/Welcome.tsx
git commit -m "style: redesign Welcome screen with compact layout"
```

---

### Task 9: Chat Screen Redesign

**Files:**
- Modify: `orbit/src/screens/Chat.tsx`

**Step 1: Rewrite Chat screen**

Key changes:
- Remove header bar entirely (model info is in ChatInput)
- Messages container: max-w-[640px] (was max-w-3xl/768px)
- Message spacing: gap of 5 (20px) between messages (was space-y-6)
- No entrance animations

```tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'

type ChatProps = {
  conversation: {
    id: string
    title: string
    model: string
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      model?: string
      timestamp: string
    }>
  }
  onSend: (content: string) => void
  selectedModel: { id: string; name: string; parameterCount: string }
  downloadedModels: Array<{ id: string; name: string; parameterCount: string }>
  onSelectModel: (modelId: string) => void
}

export default function Chat({
  conversation,
  onSend,
  selectedModel,
  downloadedModels,
  onSelectModel,
}: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [conversation.messages, scrollToBottom])

  useEffect(() => {
    const messages = conversation.messages
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === 'assistant') {
      setStreamingMessageId(lastMessage.id)
      const timer = setTimeout(() => {
        setStreamingMessageId(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [conversation.messages])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-5 max-w-[640px] mx-auto">
          {conversation.messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              model={msg.model}
              timestamp={msg.timestamp}
              isStreaming={msg.id === streamingMessageId}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        selectedModel={selectedModel}
        downloadedModels={downloadedModels}
        onSelectModel={onSelectModel}
      />
    </div>
  )
}
```

**Step 2: Verify Chat screen**

Run: `cd orbit && npm run dev`, start a conversation.
Expected: No header bar. Messages in 640px column, left-aligned with avatars, 20px gap, clean stone colors.

**Step 3: Commit**

```bash
git add orbit/src/screens/Chat.tsx
git commit -m "style: redesign Chat screen, remove header, use 640px max-width"
```

---

### Task 10: Model Library Screen Redesign

**Files:**
- Modify: `orbit/src/screens/ModelLibrary.tsx`

**Step 1: Rewrite Model Library screen**

Key changes:
- Title: 14px semibold (was text-2xl)
- Subtitle: 12px stone-500
- Featured card uses `variant="featured"` on ModelCard
- Filter pills: 11px, stone-900/white active, stone-100/stone-500 inactive, rounded (4px), height 28px
- Remove scale animations on filter pills
- Remove staggered entrance animations on grid items
- Grid padding: p-6 (was p-8)
- Max-width 960px centered

```tsx
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { Model } from '../data/mock'
import ModelCard from '../components/ModelCard'

type Filter = 'all' | 'chat' | 'code' | 'creative' | 'small' | 'medium' | 'large'

type ModelLibraryProps = {
  models: Model[]
  downloadProgress: Record<string, number>
  onDownload: (modelId: string) => void
}

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chat', label: 'Chat' },
  { key: 'code', label: 'Code' },
  { key: 'creative', label: 'Creative' },
  { key: 'small', label: '<5 GB' },
  { key: 'medium', label: '5-20 GB' },
  { key: 'large', label: '20 GB+' },
]

function parseSize(size: string): number {
  const match = size.match(/([\d.]+)\s*(GB|MB|TB)/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  if (unit === 'TB') return value * 1000
  if (unit === 'MB') return value / 1000
  return value
}

function matchesFilter(model: Model, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'chat':
    case 'code':
    case 'creative':
      return model.categories.includes(filter)
    case 'small':
      return parseSize(model.size) < 5
    case 'medium': {
      const s = parseSize(model.size)
      return s >= 5 && s <= 20
    }
    case 'large':
      return parseSize(model.size) > 20
  }
}

export default function ModelLibrary({ models, downloadProgress, onDownload }: ModelLibraryProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

  const featuredModel = models.find((m) => m.featured)
  const filteredModels = models
    .filter((m) => !m.featured)
    .filter((m) => matchesFilter(m, activeFilter))

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white px-6 py-6">
      <div className="max-w-[960px] mx-auto w-full">
        {/* Header */}
        <div className="mb-5 shrink-0">
          <h1 className="text-[14px] font-semibold text-stone-900">Model Library</h1>
          <p className="mt-0.5 text-[12px] text-stone-500">Browse and download open-source AI models</p>
        </div>

        {/* Featured model */}
        {featuredModel && (
          <div className="mb-5 shrink-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-teal-500" />
              <span className="text-[11px] font-medium text-teal-600">Featured</span>
            </div>
            <ModelCard
              model={featuredModel}
              downloadProgress={downloadProgress[featuredModel.id]}
              onDownload={onDownload}
              variant="featured"
            />
          </div>
        )}

        {/* Filter pills */}
        <div className="mb-4 flex shrink-0 flex-wrap gap-1.5">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`rounded px-2.5 py-1 text-[11px] transition-colors duration-150 cursor-pointer ${
                activeFilter === key
                  ? 'bg-stone-900 text-white font-medium'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Model grid */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              downloadProgress={downloadProgress[model.id]}
              onDownload={onDownload}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify Model Library screen**

Run: `cd orbit && npm run dev`, navigate to Models.
Expected: 14px title, compact filter pills, featured card with cloud gradient + grain overlay, regular cards with stone borders. No entrance animations.

**Step 3: Commit**

```bash
git add orbit/src/screens/ModelLibrary.tsx
git commit -m "style: redesign Model Library with cloud gradient featured card"
```

---

### Task 11: Hardware Audit Screen Redesign

**Files:**
- Modify: `orbit/src/screens/HardwareAudit.tsx`

**Step 1: Rewrite Hardware Audit screen**

Key changes:
- Idle state: Cpu icon 40px stone-400 (was 64px), heading 14px (was text-2xl), button stone-900 radius 4px (was rounded-xl)
- Scanning: Replace ripple circles with OrbitPulse (40px size), mono progress in stone-500
- Results: Title 14px semibold, spec cards with stone borders, smaller icon containers (32px), tighter padding
- Remove all staggered entrance animations
- Compatibility badges: teal/amber/stone colors (was green/yellow/red)
- Remove indigo colors entirely
- Max-width: max-w-[960px]

```tsx
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Cpu, MemoryStick, Monitor, HardDrive, Check, AlertTriangle } from 'lucide-react'
import { hardwareSpecs, models } from '../data/mock'
import OrbitPulse from '../components/OrbitPulse'

type HardwareAuditProps = {
  onNavigateToModels?: () => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Cpu,
  MemoryStick,
  Monitor,
  HardDrive,
}

const iconColorMap: Record<string, string> = {
  Cpu: 'bg-stone-100 text-stone-600',
  MemoryStick: 'bg-stone-100 text-stone-600',
  Monitor: 'bg-stone-100 text-stone-600',
  HardDrive: 'bg-stone-100 text-stone-600',
}

const statusDotColor: Record<string, string> = {
  good: 'bg-green-500',
  warning: 'bg-amber-500',
  low: 'bg-red-500',
}

const compatibilityConfig = {
  full: {
    label: 'Full Speed',
    classes: 'bg-teal-50 text-teal-700',
  },
  partial: {
    label: 'Reduced Speed',
    classes: 'bg-amber-50 text-amber-700',
  },
  incompatible: {
    label: 'Incompatible',
    classes: 'bg-stone-100 text-stone-500',
  },
}

export default function HardwareAudit({ onNavigateToModels }: HardwareAuditProps) {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'results'>('idle')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (scanState !== 'scanning') return

    setProgress(0)
    const duration = 3000
    const interval = 30
    const steps = duration / interval
    let current = 0

    const timer = setInterval(() => {
      current++
      setProgress(Math.min(Math.round((current / steps) * 100), 100))
      if (current >= steps) {
        clearInterval(timer)
        setScanState('results')
      }
    }, interval)

    return () => clearInterval(timer)
  }, [scanState])

  const fullSpeedCount = models.filter((m) => m.compatibility === 'full').length

  return (
    <div className="h-full overflow-y-auto bg-white px-6 py-6">
      <AnimatePresence mode="wait">
        {scanState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col items-center justify-center"
          >
            <Cpu className="h-10 w-10 text-stone-400 mb-4" strokeWidth={1.5} />
            <h1 className="mb-1 text-[14px] font-semibold text-stone-900">Scan Your Hardware</h1>
            <p className="mb-6 text-[12px] text-stone-500">
              Detect your system specs and find compatible models
            </p>
            <button
              onClick={() => setScanState('scanning')}
              className="cursor-pointer rounded bg-stone-900 px-5 py-2 text-[13px] font-medium text-white hover:bg-stone-700 transition-colors active:scale-[0.98]"
            >
              Start Scan
            </button>
          </motion.div>
        )}

        {scanState === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col items-center justify-center"
          >
            <div className="mb-4">
              <OrbitPulse size={40} label="" />
            </div>
            <p className="text-[13px] text-stone-500 mb-1">Scanning hardware...</p>
            <p className="text-[14px] font-mono font-medium text-stone-500">
              {progress}%
            </p>
          </motion.div>
        )}

        {scanState === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-[960px]"
          >
            {/* Header */}
            <div className="mb-4 flex items-center gap-2">
              <h1 className="text-[14px] font-semibold text-stone-900">System Profile</h1>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <Check className="h-3 w-3 text-green-600" />
              </span>
            </div>

            {/* Spec cards grid */}
            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {hardwareSpecs.map((spec) => {
                const Icon = iconMap[spec.icon]
                return (
                  <div
                    key={spec.label}
                    className="rounded-md border border-stone-200 bg-white p-3.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-md ${iconColorMap[spec.icon]}`}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-stone-400">
                            {spec.label}
                          </p>
                          <p className="mt-0.5 text-[13px] font-medium font-mono text-stone-900">
                            {spec.value}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full ${statusDotColor[spec.status]}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Model Compatibility */}
            <div>
              <h2 className="mb-3 text-[14px] font-semibold text-stone-900">Model Compatibility</h2>
              <div className="space-y-1">
                {models.map((model) => {
                  const compat = compatibilityConfig[model.compatibility]
                  return (
                    <div
                      key={model.id}
                      className="flex items-center justify-between rounded-md border-b border-stone-100 px-3 py-2.5 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13px] font-medium text-stone-900">{model.name}</span>
                        <span className="text-[12px] text-stone-400">{model.parameterCount}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-stone-500">{model.size}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-medium ${compat.classes}`}
                        >
                          {compat.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] text-stone-500">
                <AlertTriangle className="h-3.5 w-3.5 text-green-500" />
                <span>
                  Your system can run{' '}
                  <span className="font-medium text-stone-900">{fullSpeedCount} models</span>{' '}
                  at full speed
                </span>
              </div>
              <button
                onClick={onNavigateToModels}
                className="cursor-pointer rounded bg-stone-900 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-stone-700 transition-colors active:scale-[0.98]"
              >
                Browse Model Library
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Verify Hardware Audit screen**

Run: `cd orbit && npm run dev`, navigate to Hardware.
Expected: Compact layout, OrbitPulse during scan, stone colors, teal compatibility badges.

**Step 3: Commit**

```bash
git add orbit/src/screens/HardwareAudit.tsx
git commit -m "style: redesign Hardware Audit with OrbitPulse and stone palette"
```

---

### Task 12: MCP Tools Screen Redesign

**Files:**
- Modify: `orbit/src/screens/MCPTools.tsx`

**Step 1: Rewrite MCP Tools screen**

Key changes:
- Title: 14px semibold (was text-2xl)
- Connected badge: teal-50/teal-700 (was green)
- Tool cards: stone borders, 14px padding, radius 6px
- Connected cards: teal left-edge inset shadow + teal border
- Toggle: 36x20px, teal-500 on (was green-500 44x24px)
- Icon containers: 32px, stone-100 bg (was colored per-icon)
- Status dot: teal-500 with pulse animation when connected
- Remove staggered entrance animations
- Config syntax: stone-600 for keys, teal-700 for values (was indigo/green)
- Max-width: max-w-[960px]

```tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  MessageSquare,
  Github,
  Calendar,
  BookOpen,
  FolderOpen,
  ChevronDown,
} from 'lucide-react'
import { mcpTools as defaultTools, type MCPTool } from '../data/mock'

type MCPToolsProps = {
  tools?: Array<{
    id: string
    name: string
    description: string
    icon: string
    connected: boolean
    configSnippet: string
  }>
  onToggleConnection?: (toolId: string) => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  MessageSquare,
  Github,
  Calendar,
  BookOpen,
  FolderOpen,
}

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors duration-150 cursor-pointer flex-shrink-0 ${
        enabled ? 'bg-teal-500' : 'bg-stone-200'
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <motion.div
        className="absolute top-[2px] w-4 h-4 rounded-full bg-white"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
        animate={{ left: enabled ? 18 : 2 }}
        transition={{ duration: 0.15 }}
      />
    </button>
  )
}

function highlightConfig(snippet: string): React.ReactNode[] {
  return snippet.split('\n').map((line, i) => {
    const parts: React.ReactNode[] = []
    let remaining = line
    let key = 0

    while (remaining.length > 0) {
      const keyMatch = remaining.match(/^("[\w_-]+")\s*(:)/)
      if (keyMatch) {
        parts.push(
          <span key={key++} className="text-stone-600">
            {keyMatch[1]}
          </span>
        )
        parts.push(keyMatch[2])
        remaining = remaining.slice(keyMatch[0].length)
        continue
      }

      const strMatch = remaining.match(/^("[^"]*")/)
      if (strMatch) {
        parts.push(
          <span key={key++} className="text-teal-700">
            {strMatch[1]}
          </span>
        )
        remaining = remaining.slice(strMatch[0].length)
        continue
      }

      parts.push(remaining[0])
      remaining = remaining.slice(1)
    }

    return (
      <div key={i}>
        {parts.length > 0 ? parts : '\u00A0'}
      </div>
    )
  })
}

function ToolCard({
  tool,
  onToggle,
}: {
  tool: MCPTool
  onToggle: () => void
}) {
  const [showConfig, setShowConfig] = useState(false)
  const Icon = iconMap[tool.icon]

  return (
    <div
      className={`bg-white rounded-md p-3.5 transition-all duration-200 ${
        tool.connected
          ? 'border border-teal-200/50'
          : 'border border-stone-200'
      }`}
      style={tool.connected ? {
        boxShadow: 'inset 3px 0 0 rgba(13, 148, 136, 0.3)',
      } : undefined}
    >
      {/* Top row */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-stone-100 flex items-center justify-center shrink-0">
          {Icon && <Icon className="w-4 h-4 text-stone-600" />}
        </div>
        <span className="text-[13px] font-medium text-stone-900 flex-1">
          {tool.name}
        </span>
        <ToggleSwitch enabled={tool.connected} onToggle={onToggle} />
      </div>

      {/* Description */}
      <p className="text-[12px] text-stone-500 mt-1.5 ml-[42px]">{tool.description}</p>

      {/* Status */}
      <div className="flex items-center gap-1.5 mt-2 ml-[42px]">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            tool.connected ? 'bg-teal-500' : 'bg-stone-300'
          }`}
          style={tool.connected ? { animation: 'status-pulse 2s ease-in-out infinite' } : undefined}
        />
        <span className={`text-[11px] ${tool.connected ? 'text-teal-600' : 'text-stone-400'}`}>
          {tool.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Config section */}
      {tool.connected && (
        <div className="mt-2 ml-[42px]">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
          >
            <span>Config</span>
            <motion.div
              animate={{ rotate: showConfig ? 180 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-3 h-3" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {showConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="bg-stone-50 border border-stone-200 rounded-md p-3 mt-2 font-mono text-[11px] text-stone-700 overflow-x-auto">
                  {highlightConfig(tool.configSnippet)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default function MCPTools({ tools: propTools, onToggleConnection }: MCPToolsProps = {}) {
  const [internalTools, setInternalTools] = useState<MCPTool[]>(defaultTools)
  const tools = propTools ?? internalTools
  const connectedCount = tools.filter((t) => t.connected).length

  function handleToggle(toolId: string) {
    if (onToggleConnection) {
      onToggleConnection(toolId)
    } else {
      setInternalTools((prev) =>
        prev.map((t) =>
          t.id === toolId ? { ...t, connected: !t.connected } : t
        )
      )
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto px-6 py-6 bg-white">
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[14px] font-semibold text-stone-900">MCP Tools</h1>
            <p className="text-[12px] text-stone-500 mt-0.5">
              Connect services to enhance Orbit
            </p>
          </div>
          <span className="bg-teal-50 text-teal-700 rounded px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
            {connectedCount} Connected
          </span>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onToggle={() => handleToggle(tool.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify MCP Tools screen**

Run: `cd orbit && npm run dev`, navigate to Tools.
Expected: Compact cards, stone borders, teal accents on connected tools with left-edge glow, smaller toggle switches, pulsing status dots.

**Step 3: Commit**

```bash
git add orbit/src/screens/MCPTools.tsx
git commit -m "style: redesign MCP Tools with teal connected state and compact layout"
```

---

### Task 13: Final Verification and Build Check

**Files:**
- No new files

**Step 1: Run type check**

Run: `cd orbit && npm run build`
Expected: TypeScript compiles with no errors, Vite builds successfully.

**Step 2: Visual walkthrough**

Run: `cd orbit && npm run dev`

Verify each screen:
1. **Welcome**: Compact centered layout, small Orbit icon, 2-col suggestions, compact input
2. **Chat**: No header, left-aligned messages with avatars, blinking cursor, 640px max-width
3. **Hardware**: OrbitPulse animation during scan, stone palette results
4. **Models**: Cloud gradient featured card with grain overlay, compact filter pills, stone-bordered regular cards
5. **Tools**: Teal left-edge glow on connected tools, smaller toggles, stone palette

Verify interactions:
- Sidebar collapses to 48px, expands to 220px
- Model selector dropdown works in ChatInput
- Send button appears when typing
- Filter pills switch correctly
- Download progress bars show teal
- Toggle switches animate smoothly

**Step 3: Commit final state**

```bash
git add -A
git commit -m "style: complete Orbit UI redesign - Swiss Precision + Frosted Native"
```
