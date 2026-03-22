import { useState, useCallback } from 'react'
import type { Conversation, Message, MCPTool } from '../types/models'
import { conversations as initialConversations, mcpTools as initialTools } from '../data/mock'

export type Screen = 'welcome' | 'chat' | 'hardware' | 'models' | 'tools'

export function useAppState() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome')
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string>('llama-3.3-70b')
  const [mcpTools, setMcpTools] = useState<MCPTool[]>(initialTools)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null

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

  const createConversation = useCallback((content: string, modelName: string): string => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp,
    }
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: content.slice(0, 40) + (content.length > 40 ? '...' : ''),
      lastMessage: content.slice(0, 60) + '...',
      timestamp: 'Just now',
      model: modelName,
      messages: [userMessage],
    }
    setConversations(prev => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setCurrentScreen('chat')
    return newConv.id
  }, [])

  const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
    setConversations(prev => prev.map(c =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, message], lastMessage: message.content.slice(0, 60) + '...' }
        : c
    ))
  }, [])

  const sendMessage = useCallback((content: string, modelName: string) => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp,
    }

    if (activeConversationId) {
      setConversations(prev => prev.map(c =>
        c.id === activeConversationId
          ? { ...c, messages: [...c.messages, userMessage], lastMessage: content.slice(0, 60) + '...' }
          : c
      ))
    } else {
      createConversation(content, modelName)
    }
  }, [activeConversationId, createConversation])

  const toggleToolConnection = useCallback((toolId: string) => {
    setMcpTools(prev => prev.map(t =>
      t.id === toolId ? { ...t, connected: !t.connected } : t
    ))
  }, [])

  return {
    currentScreen,
    conversations,
    activeConversation,
    activeConversationId,
    selectedModelId,
    mcpTools,
    sidebarCollapsed,
    navigateTo,
    openConversation,
    startNewChat,
    sendMessage,
    createConversation,
    addMessageToConversation,
    setSelectedModelId,
    toggleToolConnection,
    setSidebarCollapsed,
  }
}
