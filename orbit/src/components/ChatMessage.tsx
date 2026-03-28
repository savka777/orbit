import OrbitMark from './OrbitMark'

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
          className="my-3 overflow-x-auto rounded-2xl border border-white/8 bg-white/4 p-3 font-mono text-[12px]"
        >
          <code className="text-stone-100">{code}</code>
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
  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="rounded-2xl bg-white/8 px-4 py-2.5">
            <div className="text-[13px] font-medium leading-[1.5] text-stone-50">
              {renderContent(content)}
            </div>
          </div>
          {timestamp && (
            <div className="mt-1 text-right text-[11px] font-mono text-white/24">
              {timestamp}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/8 bg-white/4">
          <OrbitMark className="h-3.5 w-3.5 text-white/78" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] leading-[1.75] text-white/78">
          {renderContent(content)}
          {isStreaming && (
            <span
              className="ml-px inline-block h-[1.1em] w-[2px] align-text-bottom bg-white"
              style={{ animation: 'blink-cursor 500ms step-end infinite' }}
            />
          )}
        </div>

        {timestamp && (
          <div className="mt-1 text-[11px] font-mono text-white/24">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  )
}
