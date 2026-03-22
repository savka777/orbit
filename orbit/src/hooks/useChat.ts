import { useState, useEffect, useRef, useCallback } from 'react'
import type { OllamaChatMessage } from '../types/ollama'

function hasOrbit() { return typeof window !== 'undefined' && !!window.orbit }

export type UseChatOptions = {
  model: string
  conversationId: string
  onStreamComplete: (content: string) => void
}

export function useChat({ model, conversationId, onStreamComplete }: UseChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedContent, setStreamedContent] = useState('')
  const [error, setError] = useState<Error | null>(null)

  const streamedRef = useRef('')
  const generationRef = useRef(0)
  const isStreamingRef = useRef(false)
  const onStreamCompleteRef = useRef(onStreamComplete)
  onStreamCompleteRef.current = onStreamComplete

  useEffect(() => {
    if (!hasOrbit()) return
    const gen = ++generationRef.current
    const cleanupChunk = window.orbit.onChatChunk((data) => {
      if (gen !== generationRef.current) return
      const typed = data as { conversationId: string; chunk: { message: { content: string }; done: boolean } }
      if (typed.conversationId !== conversationId) return
      streamedRef.current += typed.chunk.message.content
      setStreamedContent(streamedRef.current)
    })
    const cleanupDone = window.orbit.onChatDone((data) => {
      if (gen !== generationRef.current) return
      const typed = data as { conversationId: string }
      if (typed.conversationId !== conversationId) return
      onStreamCompleteRef.current(streamedRef.current)
      streamedRef.current = ''
      setStreamedContent('')
      setIsStreaming(false)
      isStreamingRef.current = false
    })
    return () => { cleanupChunk(); cleanupDone() }
  }, [conversationId])

  const sendMessage = useCallback(
    async (text: string, history: OllamaChatMessage[]) => {
      if (isStreamingRef.current || !hasOrbit()) return
      setError(null)
      setIsStreaming(true)
      isStreamingRef.current = true
      streamedRef.current = ''
      setStreamedContent('')
      try {
        await window.orbit.chat(model, [...history, { role: 'user', content: text }], conversationId)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setIsStreaming(false)
        isStreamingRef.current = false
      }
    },
    [model, conversationId]
  )

  return { sendMessage, isStreaming, streamedContent, error }
}
