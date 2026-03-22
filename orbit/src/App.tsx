import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState } from './hooks/useAppState'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useOllama } from './hooks/useOllama'
import Sidebar from './components/Sidebar'
import GrainFilter from './components/GrainFilter'
import Welcome from './screens/Welcome'
import Chat from './screens/Chat'
import HardwareAudit from './screens/HardwareAudit'
import ModelLibrary from './screens/ModelLibrary'
import MCPTools from './screens/MCPTools'

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const pageTransition = {
  duration: 0.15,
  ease: 'easeInOut' as const,
}

export default function App() {
  const {
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
    addMessageToConversation,
    setSelectedModelId,
    toggleToolConnection,
    setSidebarCollapsed,
  } = useAppState()

  const ollama = useOllama()
  const selectedModel = ollama.models.find(m => m.id === selectedModelId) ?? ollama.models[0] ?? { id: '', name: 'No model', parameterCount: '' }
  const downloadedModels = ollama.models.filter(m => m.downloaded)

  const handleSendMessage = useCallback((content: string) => {
    sendMessage(content, selectedModel.name)
  }, [sendMessage, selectedModel.name])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev: boolean) => !prev)
  }, [setSidebarCollapsed])

  useKeyboardNav({
    onNavigate: navigateTo,
    onNewChat: startNewChat,
    onToggleSidebar: toggleSidebar,
  })

  function renderScreen() {
    switch (currentScreen) {
      case 'welcome':
        return (
          <Welcome
            onSend={handleSendMessage}
            selectedModel={selectedModel}
            downloadedModels={downloadedModels}
            onSelectModel={setSelectedModelId}
            onSuggestionClick={handleSendMessage}
          />
        )
      case 'chat':
        if (!activeConversation) return null
        return (
          <Chat
            conversation={activeConversation}
            onSendMessage={handleSendMessage}
            onAddMessage={addMessageToConversation}
            selectedModel={selectedModel}
            downloadedModels={downloadedModels}
            onSelectModel={setSelectedModelId}
          />
        )
      case 'hardware':
        return (
          <HardwareAudit
            onNavigateToModels={() => navigateTo('models')}
          />
        )
      case 'models':
        return (
          <ModelLibrary
            models={ollama.models}
            downloadProgress={ollama.downloadProgress}
            onDownload={ollama.pullModel}
            isLoading={ollama.isLoading}
          />
        )
      case 'tools':
        return (
          <MCPTools
            tools={mcpTools}
            onToggleConnection={toggleToolConnection}
          />
        )
    }
  }

  return (
    <>
      <GrainFilter />
      <div className="app-shell flex h-full min-h-0 w-full overflow-hidden">
        <Sidebar
          currentScreen={currentScreen}
          conversations={conversations}
          activeConversationId={activeConversationId}
          collapsed={sidebarCollapsed}
          onNavigate={navigateTo}
          onOpenConversation={openConversation}
          onNewChat={startNewChat}
          onToggleCollapse={toggleSidebar}
        />

        <main className="app-main-surface relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/4 to-transparent" />
            <div className="absolute right-[-12%] top-[-10%] h-72 w-72 rounded-full bg-[#4f63ff]/10 blur-3xl" />
            <div className="absolute bottom-[-16%] left-[18%] h-72 w-72 rounded-full bg-teal-400/5 blur-3xl" />
          </div>
          <div className="drag-region h-11 w-full shrink-0" />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden pt-10"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  )
}
