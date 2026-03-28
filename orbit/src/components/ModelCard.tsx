import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import type { Model } from '../types/models'
import LiquidGradient from './LiquidGradient'

type ModelCardProps = {
  model: Model
  downloadProgress?: number
  onDownload: (modelId: string) => void
  onDelete?: (modelId: string) => void
  variant?: 'default' | 'featured'
}

export default function ModelCard({ model, downloadProgress, onDownload, onDelete, variant = 'default' }: ModelCardProps) {
  const isDownloading = downloadProgress !== undefined && downloadProgress > 0 && !model.downloaded
  const isFeatured = variant === 'featured'
  const [showRemove, setShowRemove] = useState(false)
  const removeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showRemove) return
    function handleClickOutside(e: MouseEvent) {
      if (removeRef.current && !removeRef.current.contains(e.target as Node)) {
        setShowRemove(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showRemove])

  if (isFeatured) {
    return (
      <div className="relative overflow-hidden rounded-[28px]" style={{ minHeight: 160 }}>
        <LiquidGradient />

        <div className="relative z-10 flex h-full min-h-[160px] flex-col justify-end p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="text-[16px] font-semibold text-white">{model.name}</h3>
                <span className="font-mono text-[12px] text-white/58">
                  {model.parameterCount} / {model.size}
                </span>
              </div>
              <p className="max-w-[75%] text-[12px] leading-relaxed text-white/68">
                {model.description}
              </p>
            </div>

            <div className="shrink-0 ml-4">
              {model.downloaded ? (
                <div className="relative" ref={removeRef}>
                  <button
                    onClick={() => setShowRemove(prev => !prev)}
                    className="cursor-pointer rounded-full bg-white px-3 py-1 text-[11px] font-medium text-stone-900 transition-colors hover:bg-stone-100"
                  >
                    Ready
                  </button>
                  {showRemove && onDelete && (
                    <div
                      className="absolute right-0 top-full mt-1 z-20 rounded-2xl border border-white/8 bg-[rgba(27,28,32,0.96)] px-1 py-1"
                      style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)' }}
                    >
                      <button
                        onClick={() => { onDelete(model.id); setShowRemove(false) }}
                        className="cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] text-red-400 transition-colors hover:bg-white/6"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ) : isDownloading ? (
                <span className="text-[11px] font-mono text-white/52">
                  {downloadProgress}%
                </span>
              ) : (
                <button
                  onClick={() => onDownload(model.id)}
                  className="flex cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-95"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              )}
            </div>
          </div>

          {isDownloading && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-white/70"
                animate={{ width: `${downloadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-card app-card-hover relative overflow-hidden rounded-[22px] p-4 cursor-default">
      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1" />
          <div className="shrink-0">
            {model.downloaded ? (
              <div className="relative" ref={removeRef}>
                <button
                  onClick={() => setShowRemove(prev => !prev)}
                  className="cursor-pointer rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-stone-900 transition-colors hover:bg-stone-100"
                >
                  Ready
                </button>
                {showRemove && onDelete && (
                  <div
                    className="absolute right-0 top-full mt-1 z-20 rounded-2xl border border-white/8 bg-[rgba(27,28,32,0.96)] px-1 py-1"
                    style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)' }}
                  >
                    <button
                      onClick={() => { onDelete(model.id); setShowRemove(false) }}
                      className="cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] text-red-400 transition-colors hover:bg-white/6"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ) : isDownloading ? (
              <span className="text-[11px] font-mono text-white/52">
                {downloadProgress}%
              </span>
            ) : (
              <button
                onClick={() => onDownload(model.id)}
                className="flex cursor-pointer items-center gap-1 rounded-full border border-white/8 bg-white/6 px-2.5 py-1 text-[11px] font-medium text-stone-100 transition-colors hover:bg-white/10 active:scale-95"
              >
                <Download className="h-3 w-3" />
                Download
              </button>
            )}
          </div>
        </div>

        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="text-[14px] font-semibold text-stone-50">{model.name}</h3>
          <span className="font-mono text-[12px] text-white/38">
            {model.parameterCount} / {model.size}
          </span>
        </div>

        <p className="line-clamp-3 text-[12px] leading-relaxed text-white/44">
          {model.description}
        </p>

        {isDownloading && (
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-[#7d92ff]"
              animate={{ width: `${downloadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
