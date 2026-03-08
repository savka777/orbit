import { useEffect } from 'react'
import type { Screen } from './useAppState'

type KeyboardNavOptions = {
  onNavigate: (screen: Screen) => void
  onNewChat: () => void
  onToggleSidebar: () => void
}

const screenKeys: Record<string, Screen> = {
  '1': 'welcome',
  '2': 'chat',
  '3': 'hardware',
  '4': 'models',
  '5': 'tools',
}

export function useKeyboardNav({ onNavigate, onNewChat, onToggleSidebar }: KeyboardNavOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+N: new chat
      if (meta && e.key === 'n') {
        e.preventDefault()
        onNewChat()
        return
      }

      // Cmd+B: toggle sidebar
      if (meta && e.key === 'b') {
        e.preventDefault()
        onToggleSidebar()
        return
      }

      // Cmd+1-5: navigate screens
      if (meta && screenKeys[e.key]) {
        e.preventDefault()
        onNavigate(screenKeys[e.key])
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigate, onNewChat, onToggleSidebar])
}
