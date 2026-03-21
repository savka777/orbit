import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { Model } from '../types/models'
import ModelCard from '../components/ModelCard'

type Filter = 'all' | 'chat' | 'code' | 'creative' | 'small' | 'medium' | 'large'

type ModelLibraryProps = {
  models: Model[]
  downloadProgress: Record<string, number>
  onDownload: (modelId: string) => void
  isLoading?: boolean
}

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chat', label: 'Chat' },
  { key: 'code', label: 'Code' },
  { key: 'creative', label: 'Creative' },
  { key: 'small', label: '<5 GB' },
  { key: 'medium', label: '5-20 GB' },
  { key: 'large', label: '20 GB+' },
]

function parseSize(size: string): number {
  const match = size.match(/([\d.]+)\s*(GB|MB|TB)/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  if (unit === 'TB') return value * 1000
  if (unit === 'MB') return value / 1000
  return value
}

function matchesFilter(model: Model, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'chat':
    case 'code':
    case 'creative':
      return model.categories.includes(filter)
    case 'small':
      return parseSize(model.size) < 5
    case 'medium': {
      const s = parseSize(model.size)
      return s >= 5 && s <= 20
    }
    case 'large':
      return parseSize(model.size) > 20
  }
}

export default function ModelLibrary({ models, downloadProgress, onDownload, isLoading }: ModelLibraryProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-white/38">Loading models...</p>
      </div>
    )
  }

  const featuredModel = models.find((m) => m.featured)
  const filteredModels = models
    .filter((m) => !m.featured)
    .filter((m) => matchesFilter(m, activeFilter))

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 pb-6">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="mb-5 shrink-0">
          <h1 className="text-[14px] font-semibold text-stone-50">Model Library</h1>
          <p className="mt-0.5 text-[12px] text-white/38">Browse and download local-first AI models</p>
        </div>

        {featuredModel && (
          <div className="mb-5 shrink-0">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#8ea0ff]" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-white/55">Featured</span>
            </div>
            <ModelCard
              model={featuredModel}
              downloadProgress={downloadProgress[featuredModel.id]}
              onDownload={onDownload}
              variant="featured"
            />
          </div>
        )}

        <div className="mb-4 flex shrink-0 flex-wrap gap-1.5">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] transition-colors duration-150 ${
                activeFilter === key
                  ? 'bg-white text-stone-900 font-medium'
                  : 'border border-white/8 bg-white/4 text-white/46 hover:bg-white/7 hover:text-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              downloadProgress={downloadProgress[model.id]}
              onDownload={onDownload}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
