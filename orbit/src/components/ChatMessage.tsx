import { useState, useEffect } from 'react'
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
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
            <span className="text-[10px] font-medium text-stone-100">Y</span>
          </div>
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/8 bg-white/4">
            <OrbitMark className="h-3.5 w-3.5 text-white/78" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-0.5 text-[11px] text-white/34">
          {isUser ? 'You' : (
            <span className="font-mono text-white/48">{model || 'assistant'}</span>
          )}
        </div>

        <div className={`text-[13px] ${isUser ? 'font-medium leading-[1.5] text-stone-50' : 'leading-[1.75] text-white/78'}`}>
          {renderContent(visibleContent)}
          {showCursor && (
            <span
              className="ml-px inline-block h-[1.1em] w-[2px] align-text-bottom bg-white"
              style={{ animation: 'blink-cursor 500ms step-end infinite' }}
            />
          )}
        </div>

        <div className="mt-1 text-[11px] font-mono text-white/24">
          {timestamp}
        </div>
      </div>
    </div>
  )
}
