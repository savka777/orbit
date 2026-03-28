import { useState, useEffect } from 'react'
import OrbitMark from './OrbitMark'

type ChatMessageProps = {
  role: 'user' | 'assistant'
  content: string
  model?: string
  timestamp: string
  isStreaming?: boolean
  isThinking?: boolean
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

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <div
        className="h-2 w-2 rounded-sm bg-white/40"
        style={{ animation: 'thinking-pulse 1.4s ease-in-out infinite' }}
      />
      <div
        className="h-2 w-2 rounded-sm bg-white/40"
        style={{ animation: 'thinking-pulse 1.4s ease-in-out 0.2s infinite' }}
      />
      <div
        className="h-2 w-2 rounded-sm bg-white/40"
        style={{ animation: 'thinking-pulse 1.4s ease-in-out 0.4s infinite' }}
      />
      <style>{`
        @keyframes thinking-pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}

export default function ChatMessage({
  role,
  content,
  model,
  timestamp,
  isStreaming = false,
  isThinking = false,
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

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="rounded-2xl bg-white/8 px-4 py-2.5">
            <div className="text-[13px] font-medium leading-[1.5] text-stone-50">
              {renderContent(visibleContent)}
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
        {isThinking ? (
          <ThinkingIndicator />
        ) : (
          <>
            <div className={`text-[13px] leading-[1.75] text-white/78`}>
              {renderContent(visibleContent)}
              {showCursor && (
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
          </>
        )}
      </div>
    </div>
  )
}
