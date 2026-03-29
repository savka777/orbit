import { useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppState } from './hooks/useAppState'
import type { Screen } from './hooks/useAppState'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useModels } from './hooks/useModels'
import type { Model } from './types/models'
import Sidebar from './components/Sidebar'
import GrainFilter from './components/GrainFilter'
import Welcome from './screens/Welcome'
import Chat from './screens/Chat'
import ModelLibrary from './screens/ModelLibrary'
import MCPTools from './screens/MCPTools'
import Settings from './screens/Settings'

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const pageTransition = {
  duration: 0.15,
  ease: 'easeInOut' as const,
}

const emptyModel: Model = {
  id: '',
  name: 'No model',
  parameterCount: '',
  size: '',
  categories: [],
  description: '',
  downloaded: false,
  compatibility: 'unknown' as const,
  score: 0,
  estimatedTps: 0,
  memoryRequiredGb: 0,
  bestQuant: '',
  fitLevel: 'unknown' as const,
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
    clearAllData,
  } = useAppState()

  const modelsHook = useModels()

  // Auto-select first downloaded model
  useEffect(() => {
    if (selectedModelId === '' || !modelsHook.models.find(m => m.id === selectedModelId)) {
      const firstDownloaded = modelsHook.models.find(m => m.downloaded)
      if (firstDownloaded) setSelectedModelId(firstDownloaded.id)
    }
  }, [modelsHook.models, selectedModelId, setSelectedModelId])

  const selectedModel = modelsHook.models.find(m => m.id === selectedModelId) ?? modelsHook.models[0] ?? emptyModel
  const downloadedModels = modelsHook.models.filter(m => m.downloaded)

  const navigateToWithScan = useCallback((screen: Screen) => {
    navigateTo(screen)
    if (screen === 'models') modelsHook.triggerScan()
  }, [navigateTo, modelsHook.triggerScan])

  const handleSendMessage = useCallback((content: string) => {
    sendMessage(content, selectedModel.name)
  }, [sendMessage, selectedModel.name])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev: boolean) => !prev)
  }, [setSidebarCollapsed])

  useKeyboardNav({
    onNavigate: navigateToWithScan,
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
            ollamaStatus={modelsHook.ollamaStatus}
            ollamaLoading={modelsHook.ollamaLoading}
            hasModels={downloadedModels.length > 0}
            onNavigateToModels={() => navigateToWithScan('models')}
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
      case 'models':
        return (
          <ModelLibrary
            models={modelsHook.models}
            downloadProgress={modelsHook.downloadProgress}
            onDownload={modelsHook.pullModel}
            onDelete={modelsHook.deleteModel}
            isLoading={modelsHook.ollamaLoading}
            hasScanRun={modelsHook.hasScanRun}
            systemProfile={modelsHook.systemProfile}
            isScanning={modelsHook.isScanning}
            scanError={modelsHook.scanError}
            ollamaStatus={modelsHook.ollamaStatus}
            onNavigateToWelcome={() => navigateTo('welcome')}
          />
        )
      case 'tools':
        return (
          <MCPTools
            tools={mcpTools}
            onToggleConnection={toggleToolConnection}
          />
        )
      case 'settings':
        return (
          <Settings onClearAllData={clearAllData} />
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
          onNavigate={navigateToWithScan}
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
              className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden pt-8"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  )
}
