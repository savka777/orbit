import { useRef, useEffect } from 'react'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import { useChat } from '../hooks/useChat'
import type { Message } from '../types/models'
import type { OllamaChatMessage } from '../types/ollama'

type ChatProps = {
  conversation: {
    id: string
    title: string
    model: string
    messages: Message[]
  }
  onSendMessage: (content: string) => void
  onAddMessage: (conversationId: string, message: Message) => void
  selectedModel: { id: string; name: string; parameterCount: string }
  downloadedModels: Array<{ id: string; name: string; parameterCount: string }>
  onSelectModel: (modelId: string) => void
}

export default function Chat({
  conversation, onSendMessage, onAddMessage, selectedModel, downloadedModels, onSelectModel,
}: ChatProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { sendMessage, isStreaming, streamedContent, error } = useChat({
    model: selectedModel.name,
    conversationId: conversation.id,
    onStreamComplete: (content) => {
      const now = new Date()
      const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      onAddMessage(conversation.id, {
        id: `msg-${Date.now()}`, role: 'assistant', content, model: selectedModel.name, timestamp,
      })
    },
  })

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  useEffect(() => { scrollToBottom('smooth') }, [conversation.messages.length])

  useEffect(() => {
    if (!isStreaming) return
    let frameId: number
    const pin = () => {
      const el = scrollContainerRef.current
      if (el) el.scrollTop = el.scrollHeight
      frameId = requestAnimationFrame(pin)
    }
    frameId = requestAnimationFrame(pin)
    return () => cancelAnimationFrame(frameId)
  }, [isStreaming])

  // Welcome-to-Chat transition: auto-send if last message is unanswered user message
  const hasAutoSentRef = useRef(false)
  useEffect(() => {
    if (hasAutoSentRef.current) return
    const msgs = conversation.messages
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user' && !isStreaming) {
      hasAutoSentRef.current = true
      const history: OllamaChatMessage[] = msgs.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))
      sendMessage(msgs[msgs.length - 1].content, history)
    }
  }, [conversation.messages, isStreaming, sendMessage])

  const handleSend = (content: string) => {
    onSendMessage(content)
    const history: OllamaChatMessage[] = conversation.messages.map((m) => ({ role: m.role, content: m.content }))
    sendMessage(content, history)
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto px-6 pt-2 pb-6">
        <div className="mx-auto mb-6 flex max-w-[640px] items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/26">Conversation</div>
            <div className="mt-1 text-[14px] font-semibold text-stone-50">{conversation.title}</div>
          </div>
          <div className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-mono text-white/48">{conversation.model}</div>
        </div>
        <div className="mx-auto flex max-w-[640px] flex-col gap-5">
          {conversation.messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} model={msg.model} timestamp={msg.timestamp} isStreaming={false} />
          ))}
          {isStreaming && streamedContent && (
            <ChatMessage role="assistant" content={streamedContent} model={selectedModel.name} timestamp="" isStreaming={true} />
          )}
          {error && (
            <div className="mx-auto max-w-[640px] rounded-xl bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
              Failed to get response: {error.message}
            </div>
          )}
        </div>
      </div>
      <ChatInput onSend={handleSend} selectedModel={selectedModel} downloadedModels={downloadedModels} onSelectModel={onSelectModel} />
    </div>
  )
}
