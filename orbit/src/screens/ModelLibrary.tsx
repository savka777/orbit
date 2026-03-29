import { useState } from 'react'
import { Search, Cpu, MemoryStick, Monitor, RefreshCw, ChevronDown } from 'lucide-react'
import type { Model, HardwareSpec } from '../types/models'
import type { SystemProfile } from '../types/llmfit'
import type { OllamaStatus } from '../types/ollama'
import { isGeneralPurpose } from '../utils/modelAdapter'
import ModelCard from '../components/ModelCard'
import OrbitPulse from '../components/OrbitPulse'

type Filter = 'recommended' | 'installed' | 'all' | 'small' | 'medium' | 'large'

type ModelLibraryProps = {
  models: Model[]
  downloadProgress: Record<string, number>
  onDownload: (modelId: string) => void
  onDelete: (modelId: string) => void
  isLoading?: boolean
  hasScanRun: boolean
  systemProfile: SystemProfile | null
  isScanning: boolean
  scanError: Error | null
  ollamaStatus: OllamaStatus
}

const filters: { key: Filter; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'installed', label: 'Installed' },
  { key: 'all', label: 'All' },
  { key: 'small', label: '<5 GB' },
  { key: 'medium', label: '5-20 GB' },
  { key: 'large', label: '20 GB+' },
]

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Cpu, MemoryStick, Monitor,
}

const iconColorMap: Record<string, string> = {
  Cpu: 'border border-white/8 bg-white/4 text-white/78',
  MemoryStick: 'border border-white/8 bg-white/4 text-white/78',
  Monitor: 'border border-white/8 bg-white/4 text-white/78',
}

const statusDotColor: Record<string, string> = {
  good: 'bg-[#7d92ff]',
  warning: 'bg-[#f3ae59]',
  low: 'bg-[#ff7b7b]',
}

function mapSystemToSpecs(system: SystemProfile): HardwareSpec[] {
  const specs: HardwareSpec[] = [
    {
      label: 'CPU',
      value: `${system.cpu_name} (${system.cpu_cores}-core)`,
      icon: 'Cpu',
      status: 'good',
    },
    {
      label: 'Memory',
      value: `${system.total_ram_gb} GB${system.unified_memory ? ' Unified' : ''}`,
      icon: 'MemoryStick',
      status: system.total_ram_gb >= 16 ? 'good' : system.total_ram_gb >= 8 ? 'warning' : 'low',
    },
  ]

  if (system.has_gpu && system.gpu_name) {
    specs.push({
      label: 'GPU',
      value: system.gpu_vram_gb ? `${system.gpu_name} (${system.gpu_vram_gb} GB)` : system.gpu_name,
      icon: 'Monitor',
      status: 'good',
    })
  } else {
    specs.push({
      label: 'GPU', value: 'No dedicated GPU', icon: 'Monitor', status: 'warning',
    })
  }

  return specs
}

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
    case 'recommended':
      return (model.fitLevel === 'perfect' || model.fitLevel === 'good') && !model.downloaded
    case 'installed':
      return model.downloaded
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

export default function ModelLibrary({
  models,
  downloadProgress,
  onDownload,
  onDelete,
  isLoading,
  hasScanRun,
  systemProfile,
  isScanning,
  scanError,
  ollamaStatus,
}: ModelLibraryProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllModels, setShowAllModels] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-white/38">Loading models...</p>
      </div>
    )
  }

  const specs = systemProfile ? mapSystemToSpecs(systemProfile) : []

  // Recommended models: top 3 general-purpose perfect/good fits that aren't downloaded
  const recommendedModels = hasScanRun
    ? models
        .filter(m => (m.fitLevel === 'perfect' || m.fitLevel === 'good') && !m.downloaded && isGeneralPurpose(m.name))
        .slice(0, 3)
    : []

  const installedModels = models.filter(m => m.downloaded)

  // Catalog section: search + filter — exclude models already shown above
  // (but don't exclude installed when the "installed" filter is active)
  const excludeIds = new Set(recommendedModels.map(m => m.id))
  if (activeFilter !== 'installed') {
    for (const m of installedModels) excludeIds.add(m.id)
  }
  const query = searchQuery.toLowerCase().trim()
  const catalogModels = models
    .filter((m) => !excludeIds.has(m.id))
    .filter((m) => showAllModels || isGeneralPurpose(m.name))
    .filter((m) => matchesFilter(m, activeFilter))
    .filter((m) => !query || m.name.toLowerCase().includes(query) || m.parameterCount.toLowerCase().includes(query) || m.description.toLowerCase().includes(query))

  const specialistCount = models.filter(m => !isGeneralPurpose(m.name)).length

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 pb-6">
      <div className="mx-auto w-full max-w-[960px]">
        {/* Title */}
        <div className="mb-5 shrink-0">
          <h1 className="text-[14px] font-semibold text-stone-50">Models</h1>
          <p className="mt-0.5 text-[12px] text-white/38">Your models and hardware compatibility</p>
        </div>

        {/* System Profile Cards */}
        {isScanning && (
          <div className="mb-6 flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/4 px-4 py-4">
            <OrbitPulse size={24} label="" />
            <span className="text-[13px] text-white/38">Scanning hardware...</span>
          </div>
        )}

        {scanError && !systemProfile && (
          <div className="mb-6 flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/4 px-4 py-3">
            <span className="text-[12px] text-red-400">{scanError.message}</span>
            <button className="flex cursor-pointer items-center gap-1 text-[12px] font-medium text-[#7d92ff] hover:text-white">
              <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
              Retry
            </button>
          </div>
        )}

        {hasScanRun && systemProfile && specs.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {specs.map((spec) => {
              const Icon = iconMap[spec.icon]
              return (
                <div key={spec.label} className="app-card rounded-[22px] p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconColorMap[spec.icon]}`}>
                        {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-white/28">{spec.label}</p>
                        <p className="mt-0.5 font-mono text-[13px] font-medium text-stone-50">{spec.value}</p>
                      </div>
                    </div>
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${statusDotColor[spec.status]}`} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recommended for you */}
        {recommendedModels.length > 0 && (
          <div className="mb-6">
            <div className="mb-3">
              <h2 className="text-[14px] font-semibold text-stone-50">Recommended for your system</h2>
            </div>
            {/* #1 pick: featured variant */}
            <div className="mb-3">
              <ModelCard
                model={recommendedModels[0]}
                downloadProgress={downloadProgress[recommendedModels[0].id]}
                onDownload={onDownload}
                onDelete={onDelete}
                variant="featured"
              />
            </div>
            {/* #2 and #3: regular cards in 2-col grid */}
            {recommendedModels.length > 1 && (
              <div className="grid grid-cols-2 gap-3">
                {recommendedModels.slice(1).map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    downloadProgress={downloadProgress[model.id]}
                    onDownload={onDownload}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scan banner fallback */}
        {!hasScanRun && !isScanning && installedModels.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2.5">
            <span className="text-[12px] text-white/46">Scan your hardware to get personalized recommendations</span>
          </div>
        )}

        {/* Installed models */}
        {installedModels.length > 0 && (
          <div className="mb-6">
            <div className="mb-3">
              <h2 className="text-[14px] font-semibold text-stone-50">Installed</h2>
            </div>
            <div className="space-y-1">
              {installedModels.map((model) => (
                <div key={model.id} className="app-card app-card-hover flex items-center justify-between rounded-[18px] px-3.5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[13px] font-medium text-stone-50">{model.name}</span>
                    {model.parameterCount && <span className="text-[12px] text-white/32">{model.parameterCount}</span>}
                    <span className="rounded-full bg-[#5d79ff]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#5d79ff]">Installed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {model.size && <span className="text-[12px] text-white/40">{model.size}</span>}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(model.id)}
                        className="cursor-pointer text-[11px] text-white/32 transition-colors hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Model catalog */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-stone-50">
            {showAllModels ? 'All models' : 'General purpose'}
          </h2>
          <button
            onClick={() => setShowAllModels(!showAllModels)}
            className="flex cursor-pointer items-center gap-1 text-[12px] text-white/42 transition-colors hover:text-white"
          >
            {showAllModels ? 'Show general purpose' : `Show all models (${specialistCount} more)`}
            <ChevronDown className={`h-3 w-3 transition-transform ${showAllModels ? 'rotate-180' : ''}`} strokeWidth={1.5} />
          </button>
        </div>

        <div className="mb-4 flex shrink-0 items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
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
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/28" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="w-44 rounded-full border border-white/8 bg-white/4 py-1 pl-8 pr-3 text-[11px] text-stone-100 placeholder:text-white/28 outline-none transition-colors focus:border-white/15 focus:bg-white/6"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {catalogModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              downloadProgress={downloadProgress[model.id]}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
