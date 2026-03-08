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

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
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
      className={`relative flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150 ${
        enabled ? 'bg-[#5d79ff]' : 'bg-white/12'
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <motion.div
        className="absolute top-[2px] h-4 w-4 rounded-full bg-white"
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
          <span key={key++} className="text-white/44">
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
          <span key={key++} className="text-[#b9c4ff]">
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
      className={`app-card app-card-hover rounded-[22px] p-4 transition-all duration-200 ${
        tool.connected
          ? 'border-[#5d79ff]/35'
          : ''
      }`}
      style={tool.connected ? {
        boxShadow: 'inset 3px 0 0 rgba(93, 121, 255, 0.42), 0 18px 60px rgba(0, 0, 0, 0.28)',
      } : undefined}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
          {Icon && <Icon className="h-4 w-4 text-white/78" strokeWidth={1.5} />}
        </div>
        <span className="flex-1 text-[13px] font-medium text-stone-50">
          {tool.name}
        </span>
        <ToggleSwitch enabled={tool.connected} onToggle={onToggle} />
      </div>

      <p className="ml-[46px] mt-1.5 text-[12px] text-white/42">{tool.description}</p>

      <div className="ml-[46px] mt-3 flex items-center gap-1.5">
        <div
          className={`h-1.5 w-1.5 rounded-full ${
            tool.connected ? 'bg-[#7d92ff]' : 'bg-white/18'
          }`}
          style={tool.connected ? { animation: 'status-pulse 2s ease-in-out infinite' } : undefined}
        />
        <span className={`text-[11px] ${tool.connected ? 'text-[#b9c4ff]' : 'text-white/28'}`}>
          {tool.connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {tool.connected && (
        <div className="ml-[46px] mt-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex cursor-pointer items-center gap-1 text-[11px] text-white/34 transition-colors hover:text-white/60"
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
                <div className="mt-2 overflow-x-auto rounded-2xl border border-white/8 bg-black/20 p-3 font-mono text-[11px] text-white/68">
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
    <div className="h-full min-h-0 w-full overflow-y-auto px-6 pt-2 pb-6">
      <div className="mx-auto max-w-[960px]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-[14px] font-semibold text-stone-50">MCP Tools</h1>
            <p className="mt-0.5 text-[12px] text-white/38">
              Connect services to enhance Orbit
            </p>
          </div>
          <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-white/64">
            {connectedCount} Connected
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onToggle={() => handleToggle(tool.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
