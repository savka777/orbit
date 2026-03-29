import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

type ToastProps = {
  message: string
  action?: { label: string; onClick: () => void }
  visible: boolean
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, action, visible, onDismiss, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [visible, onDismiss, duration])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div
            className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3"
            style={{
              background: 'rgba(30, 31, 35, 0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <span className="text-[13px] text-stone-100">{message}</span>
            {action && (
              <button
                onClick={action.onClick}
                className="cursor-pointer rounded-full bg-white px-3 py-1 text-[12px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-95"
              >
                {action.label}
              </button>
            )}
            <button
              onClick={onDismiss}
              className="cursor-pointer rounded-full p-1 text-white/30 transition-colors hover:bg-white/8 hover:text-white"
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
