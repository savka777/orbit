import ChatInput from '../components/ChatInput'
import SpiralAnimation from '../components/SpiralAnimation'

type WelcomeProps = {
  onSend: (content: string) => void
  selectedModel: { id: string; name: string; parameterCount: string }
  downloadedModels: Array<{ id: string; name: string; parameterCount: string }>
  onSelectModel: (modelId: string) => void
  ollamaStatus: 'not-installed' | 'installed-not-running' | 'running'
  ollamaLoading: boolean
  hasModels: boolean
  onNavigateToHardware: () => void
}

export default function Welcome({
  onSend,
  selectedModel,
  downloadedModels,
  onSelectModel,
  ollamaStatus,
  ollamaLoading,
  hasModels,
  onNavigateToHardware,
}: WelcomeProps) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-2 flex items-center justify-center rounded-full">
            <SpiralAnimation size={160} className="rounded-full" />
          </div>
          <h1 className="text-center text-[36px] font-light italic tracking-[-0.025em] text-white" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            Orbit
          </h1>
          <div className="text-center text-[28px] tracking-[-0.02em] text-white/45">
            your ai, your rules
          </div>

          {ollamaLoading ? (
            <div className="mt-4 flex items-center gap-1">
              <span className="text-[13px] text-white/38">Loading</span>
              <span className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-white/38" style={{ animation: 'loading-dot 1.4s ease-in-out infinite' }} />
                <span className="h-1 w-1 rounded-full bg-white/38" style={{ animation: 'loading-dot 1.4s ease-in-out 0.2s infinite' }} />
                <span className="h-1 w-1 rounded-full bg-white/38" style={{ animation: 'loading-dot 1.4s ease-in-out 0.4s infinite' }} />
              </span>
              <style>{`
                @keyframes loading-dot {
                  0%, 80%, 100% { opacity: 0.2; }
                  40% { opacity: 1; }
                }
              `}</style>
            </div>
          ) : !hasModels ? (
            <button
              onClick={onNavigateToHardware}
              className="mt-4 cursor-pointer rounded-full border border-white/8 bg-white/4 px-4 py-1.5 text-[13px] text-white/58 transition-colors hover:bg-white/7 hover:text-white"
            >
              {ollamaStatus === 'not-installed' ? 'Set up your first model' : 'No models yet — browse models'}
            </button>
          ) : null}
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

      {hasModels ? (
        <div className="shrink-0 pb-6">
          <ChatInput
            onSend={onSend}
            selectedModel={selectedModel}
            downloadedModels={downloadedModels}
            onSelectModel={onSelectModel}
          />
        </div>
      ) : null}
    </div>
  )
}
