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
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-2 pb-6">
        <div className="mx-auto mb-6 flex max-w-[640px] items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/26">Conversation</div>
            <div className="mt-1 text-[14px] font-semibold text-stone-50">{conversation.title}</div>
          </div>
          <div className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-mono text-white/48">
            {conversation.model}
          </div>
        </div>

        <div className="mx-auto flex max-w-[640px] flex-col gap-5">
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

      <ChatInput
        onSend={onSend}
        selectedModel={selectedModel}
        downloadedModels={downloadedModels}
        onSelectModel={onSelectModel}
      />
    </div>
  )
}
