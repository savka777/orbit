import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowUp, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type ChatInputProps = {
  onSend: (content: string) => void
  selectedModel: { id: string; name: string; parameterCount: string }
  downloadedModels: Array<{ id: string; name: string; parameterCount: string }>
  onSelectModel: (modelId: string) => void
}

export default function ChatInput({
  onSend,
  selectedModel,
  downloadedModels,
  onSelectModel,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 4 * 24
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [input])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full shrink-0 px-6 pb-4">
      <div className="mx-auto max-w-[640px]">
        <div className="app-input-shell rounded-[22px] px-4 py-3 transition-colors">
          <div className="mb-3 flex items-center justify-between">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex cursor-pointer items-center gap-1 rounded-full bg-white/4 px-2.5 py-1 text-[11px] font-mono text-white/58 transition-colors hover:bg-white/6 hover:text-white"
              >
                {selectedModel.name} {selectedModel.parameterCount}
                <ChevronDown className="h-3 w-3" />
              </button>

              <AnimatePresence>
                {modelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 z-50 mb-2 w-60 overflow-hidden rounded-2xl border border-white/8 bg-[#131418]/98"
                    style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)' }}
                  >
                    {downloadedModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onSelectModel(model.id)
                          setModelDropdownOpen(false)
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium text-stone-100">{model.name}</div>
                          <div className="text-[11px] font-mono text-white/38">{model.parameterCount}</div>
                        </div>
                        {model.id === selectedModel.id && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-white" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {input.trim().length > 0 && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleSend}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-900 transition-colors hover:bg-stone-100 cursor-pointer active:scale-95"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Orbit anything..."
            rows={1}
            style={{ outline: 'none', boxShadow: 'none' }}
            className="w-full resize-none bg-transparent text-[13px] leading-6 text-stone-50 placeholder:text-white/26"
          />

          <div className="mt-3 flex items-center justify-between text-[11px] text-white/24">
            <div>Attach files by drag-and-drop</div>
            <div className="font-mono">Enter to send</div>
          </div>
        </div>
      </div>
    </div>
  )
}
