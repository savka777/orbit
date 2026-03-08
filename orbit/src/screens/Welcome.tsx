import { FileText, Code, BarChart3 } from 'lucide-react'
import { suggestions } from '../data/mock'
import ChatInput from '../components/ChatInput'
import SpiralAnimation from '../components/SpiralAnimation'

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
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-2 flex items-center justify-center rounded-full">
            <SpiralAnimation size={160} className="rounded-full" />
          </div>
          <h1 className="text-center text-[36px] font-semibold tracking-[-0.025em] text-white">
            Orbit
          </h1>
          <div className="text-center text-[28px] tracking-[-0.02em] text-white/45">
            ai, free for all
          </div>
        </div>
      </div>

      {/* Suggestion cards — commented out for now, may return later
      <div className="shrink-0 px-6 pb-3">
        <div className="mx-auto grid w-full max-w-[640px] grid-cols-1 gap-3 md:grid-cols-3">
          {suggestions.map((suggestion) => {
            const Icon = iconMap[suggestion.icon]
            return (
              <button
                key={suggestion.title}
                onClick={() => onSuggestionClick(suggestion.title)}
                className="app-card app-card-hover cursor-pointer rounded-[20px] px-4 py-4 text-left"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/4">
                  {Icon && <Icon className="h-4 w-4 text-white/78" strokeWidth={1.5} />}
                </div>
                <div className="text-[13px] font-medium text-stone-50">{suggestion.title}</div>
                <div className="mt-1 text-[12px] leading-relaxed text-white/44">
                  {suggestion.description}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      */}

      <div className="shrink-0 pb-6">
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
