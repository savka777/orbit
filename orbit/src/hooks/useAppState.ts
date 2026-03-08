import { useState, useCallback } from 'react'
import type { Conversation, Message, Model, MCPTool } from '../data/mock'
import { conversations as initialConversations, models as initialModels, mcpTools as initialTools, aiResponses } from '../data/mock'

export type Screen = 'welcome' | 'chat' | 'hardware' | 'models' | 'tools'

export function useAppState() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome')
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [models, setModels] = useState<Model[]>(initialModels)
  const [selectedModelId, setSelectedModelId] = useState<string>('llama-3.3-70b')
  const [mcpTools, setMcpTools] = useState<MCPTool[]>(initialTools)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})

  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null
  const selectedModel = models.find(m => m.id === selectedModelId) ?? models[0]
  const downloadedModels = models.filter(m => m.downloaded)

  const navigateTo = useCallback((screen: Screen) => {
    setCurrentScreen(screen)
    if (screen === 'welcome') {
      setActiveConversationId(null)
    }
  }, [])

  const openConversation = useCallback((id: string) => {
    setActiveConversationId(id)
    setCurrentScreen('chat')
  }, [])

  const startNewChat = useCallback(() => {
    setActiveConversationId(null)
    setCurrentScreen('welcome')
  }, [])

  const sendMessage = useCallback((content: string) => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp,
    }

    const aiContent = aiResponses[Math.floor(Math.random() * aiResponses.length)]
    const aiMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: aiContent,
      model: selectedModel.name,
      timestamp,
    }

    if (activeConversationId) {
      setConversations(prev => prev.map(c =>
        c.id === activeConversationId
          ? { ...c, messages: [...c.messages, userMessage, aiMessage], lastMessage: aiContent.slice(0, 60) + '...' }
          : c
      ))
    } else {
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
        lastMessage: aiContent.slice(0, 60) + '...',
        timestamp: 'Just now',
        model: selectedModel.name,
        messages: [userMessage, aiMessage],
      }
      setConversations(prev => [newConv, ...prev])
      setActiveConversationId(newConv.id)
      setCurrentScreen('chat')
    }
  }, [activeConversationId, selectedModel])

  const toggleToolConnection = useCallback((toolId: string) => {
    setMcpTools(prev => prev.map(t =>
      t.id === toolId ? { ...t, connected: !t.connected } : t
    ))
  }, [])

  const startModelDownload = useCallback((modelId: string) => {
    setDownloadProgress(prev => ({ ...prev, [modelId]: 0 }))

    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const current = prev[modelId] ?? 0
        if (current >= 100) {
          clearInterval(interval)
          setModels(m => m.map(model =>
            model.id === modelId ? { ...model, downloaded: true } : model
          ))
          const next = { ...prev }
          delete next[modelId]
          return next
        }
        return { ...prev, [modelId]: current + Math.random() * 8 + 2 }
      })
    }, 200)
  }, [])

  return {
    currentScreen,
    conversations,
    activeConversation,
    activeConversationId,
    models,
    selectedModel,
    selectedModelId,
    downloadedModels,
    mcpTools,
    sidebarCollapsed,
    downloadProgress,
    navigateTo,
    openConversation,
    startNewChat,
    sendMessage,
    setSelectedModelId,
    toggleToolConnection,
    startModelDownload,
    setSidebarCollapsed,
  }
}
