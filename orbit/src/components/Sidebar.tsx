import {
  SquarePen,
  Cpu,
  Layers,
  Plug,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
type SidebarProps = {
  currentScreen: 'welcome' | 'chat' | 'hardware' | 'models' | 'tools' | 'settings'
  conversations: Array<{ id: string; title: string; timestamp: string; model: string }>
  activeConversationId: string | null
  collapsed: boolean
  onNavigate: (screen: 'welcome' | 'chat' | 'hardware' | 'models' | 'tools' | 'settings') => void
  onOpenConversation: (id: string) => void
  onNewChat: () => void
  onToggleCollapse: () => void
}

const navItems = [
  { screen: 'hardware' as const, icon: Cpu, label: 'Hardware' },
  { screen: 'models' as const, icon: Layers, label: 'Models' },
  { screen: 'tools' as const, icon: Plug, label: 'Tools' },
  { screen: 'settings' as const, icon: Settings, label: 'Settings' },
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
  const [historyOpen, setHistoryOpen] = useState(true)
  const chatActive = currentScreen === 'chat' || currentScreen === 'welcome'

  return (
    <div
      className="app-sidebar relative flex h-full min-h-0 flex-col overflow-hidden transition-all duration-200 ease-in-out"
      style={{
        width: collapsed ? 48 : 260,
        minWidth: collapsed ? 48 : 260,
      }}
    >
      <div className="app-sidebar-fade pointer-events-none absolute inset-0" />

      {/* Drag region — matches main area h-11 (44px) */}
      <div className="drag-region h-11 w-full shrink-0" />

      <nav className={`relative z-10 ${collapsed ? 'px-1.5' : 'px-3'}`}>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onNewChat}
            className={`no-drag flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150 cursor-pointer ${
              collapsed ? 'justify-center px-0' : ''
            } ${
              chatActive
                ? 'text-white'
                : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <SquarePen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            {!collapsed && <span className={chatActive ? 'font-medium' : ''}>New thread</span>}
          </button>

          {navItems.map(({ screen, icon: Icon, label }) => {
            const active = currentScreen === screen
            return (
              <button
                key={screen}
                onClick={() => onNavigate(screen)}
                className={`no-drag flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150 cursor-pointer ${
                  collapsed ? 'justify-center px-0' : ''
                } ${
                  active
                    ? 'text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                {!collapsed && <span className={active ? 'font-medium' : ''}>{label}</span>}
              </button>
            )
          })}
        </div>
      </nav>

      <div className={`relative z-10 mt-6 ${collapsed ? 'px-1.5' : 'px-3'}`}>
        {!collapsed && (
          <div className="mb-2 flex items-center justify-between px-2.5">
            <span className="text-[12px] font-medium text-white/40">Threads</span>
            <button
              onClick={() => setHistoryOpen((prev) => !prev)}
              className="no-drag flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition-colors duration-150 hover:bg-white/[0.04] hover:text-white cursor-pointer"
              aria-label={historyOpen ? 'Collapse thread list' : 'Expand thread list'}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-150 ${historyOpen ? '' : '-rotate-90'}`}
                strokeWidth={1.5}
              />
            </button>
          </div>
        )}

        {!collapsed && historyOpen && (
          <div className="flex max-h-[260px] flex-col overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onOpenConversation(conv.id)}
                className={`no-drag flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors duration-150 cursor-pointer ${
                  activeConversationId === conv.id
                    ? 'bg-white/[0.05] text-white'
                    : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span className="truncate text-[12px] font-medium">{conv.title}</span>
                <span className="mt-0.5 truncate text-[11px] text-white/28">
                  {conv.model} / {conv.timestamp}
                </span>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="px-2.5 py-1 text-[12px] text-white/30">No threads</div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className={`relative z-10 flex shrink-0 flex-col items-center gap-1 p-3 ${collapsed ? '' : 'border-t border-white/6'}`}>
        <button
          onClick={onToggleCollapse}
          className="no-drag flex w-full items-center justify-center rounded-md py-1.5 text-white/35 transition-colors duration-150 hover:bg-white/5 hover:text-white cursor-pointer"
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
