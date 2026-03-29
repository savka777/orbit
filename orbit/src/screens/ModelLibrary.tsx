import { useState, useMemo } from 'react'
import { Search, Cpu, MemoryStick, Monitor, RefreshCw, ChevronDown, Download } from 'lucide-react'
import type { Model, HardwareSpec } from '../types/models'
import type { SystemProfile } from '../types/llmfit'
import type { OllamaStatus } from '../types/ollama'
import { getRecommendedModels, getAllFittingModels, type CuratedModel } from '../data/models'
import ModelCard from '../components/ModelCard'
import LiquidGradient from '../components/LiquidGradient'
import OrbitPulse from '../components/OrbitPulse'

type Filter = 'recommended' | 'installed' | 'all'

type ModelLibraryProps = {
  models: Model[]          // Installed Ollama models (from useModels)
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

function CuratedModelCard({
  model,
  isInstalled,
  isDownloading,
  progress,
  onDownload,
  variant = 'default',
}: {
  model: CuratedModel
  isInstalled: boolean
  isDownloading: boolean
  progress?: number
  onDownload: (id: string) => void
  variant?: 'default' | 'featured'
}) {
  if (variant === 'featured') {
    return (
      <div className="relative overflow-hidden rounded-[28px]" style={{ minHeight: 160 }}>
        <LiquidGradient />
        <div className="relative z-10 flex h-full min-h-[160px] flex-col justify-end p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="mb-1 flex items-baseline gap-2">
                <h3 className="text-[16px] font-semibold text-white">{model.name}</h3>
                <span className="font-mono text-[12px] text-white/58">
                  {model.parameterCount} / {model.ramRequired} GB
                </span>
                {model.toolCalling && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/80">Tools</span>
                )}
              </div>
              <p className="max-w-[75%] text-[12px] leading-relaxed text-white/68">
                {model.description}
              </p>
            </div>
            <div className="shrink-0 ml-4">
              {isInstalled ? (
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-stone-900">Installed</span>
              ) : isDownloading ? (
                <span className="text-[11px] font-mono text-white/52">{progress || 0}%</span>
              ) : (
                <button
                  onClick={() => onDownload(model.ollamaId)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-[0.97]"
                >
                  <Download className="h-3 w-3" strokeWidth={1.5} />
                  Download
                </button>
              )}
            </div>
          </div>
          {isDownloading && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white/70 transition-all" style={{ width: `${progress || 0}%` }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-card app-card-hover rounded-[22px] p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-medium text-stone-50">{model.name}</h3>
            {model.toolCalling && (
              <span className="rounded-full bg-[#5d79ff]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#5d79ff]">Tools</span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-white/42">{model.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-white/28">{model.parameterCount}</span>
            <span className="text-[11px] text-white/28">{model.ramRequired} GB</span>
            <span className="text-[11px] text-white/28">{model.provider}</span>
          </div>
        </div>
        <div className="ml-3 shrink-0">
          {isInstalled ? (
            <span className="rounded-full bg-[#5d79ff]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#5d79ff]">Installed</span>
          ) : isDownloading ? (
            <span className="text-[11px] text-white/38">{progress || 0}%</span>
          ) : (
            <button
              onClick={() => onDownload(model.ollamaId)}
              className="flex cursor-pointer items-center gap-1 rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] text-white/58 transition-colors hover:bg-white/7 hover:text-white active:scale-[0.97]"
            >
              <Download className="h-3 w-3" strokeWidth={1.5} />
              Get
            </button>
          )}
        </div>
      </div>
    </div>
  )
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
  const [activeFilter, setActiveFilter] = useState<Filter>('recommended')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllModels, setShowAllModels] = useState(false)

  const availableRam = systemProfile?.total_ram_gb ?? 16 // default 16 if no scan
  const installedIds = useMemo(() => new Set(models.filter(m => m.downloaded).map(m => m.id)), [models])

  const recommended = useMemo(() => getRecommendedModels(availableRam), [availableRam])
  const allCurated = useMemo(() => getAllFittingModels(availableRam), [availableRam])

  const topPick = recommended.find(m => !installedIds.has(m.ollamaId)) ?? null
  const installedModels = models.filter(m => m.downloaded)

  const specs = systemProfile ? mapSystemToSpecs(systemProfile) : []

  // Filter curated models for catalog
  const query = searchQuery.toLowerCase().trim()
  const catalogSource = showAllModels ? allCurated : recommended
  const catalogModels = catalogSource
    .filter(m => {
      if (activeFilter === 'installed') return installedIds.has(m.ollamaId)
      if (activeFilter === 'recommended') return !installedIds.has(m.ollamaId)
      return true
    })
    .filter(m => m !== topPick || activeFilter !== 'recommended')
    .filter(m => !query || m.name.toLowerCase().includes(query) || m.description.toLowerCase().includes(query) || m.provider.toLowerCase().includes(query))

  const specialistCount = allCurated.filter(m => m.category !== 'general').length

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-white/38">Loading models...</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 pb-6">
      <div className="mx-auto w-full max-w-[960px]">
        {/* Title */}
        <div className="mb-5 shrink-0">
          <h1 className="text-[14px] font-semibold text-stone-50">Models</h1>
          <p className="mt-0.5 text-[12px] text-white/38">
            {systemProfile
              ? `${availableRam} GB RAM — showing models that fit your system`
              : 'Browse and download AI models'}
          </p>
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

        {/* Top Pick — featured card */}
        {topPick && activeFilter !== 'installed' && (
          <div className="mb-6">
            <CuratedModelCard
              model={topPick}
              isInstalled={false}
              isDownloading={!!downloadProgress[topPick.ollamaId]}
              progress={downloadProgress[topPick.ollamaId]}
              onDownload={onDownload}
              variant="featured"
            />
          </div>
        )}

        {/* Installed models */}
        {installedModels.length > 0 && activeFilter !== 'recommended' && (
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
                    <button
                      onClick={() => onDelete(model.id)}
                      className="cursor-pointer text-[11px] text-white/32 transition-colors hover:text-red-400"
                    >
                      Remove
                    </button>
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
            {showAllModels ? 'Show recommended' : `Show all (${specialistCount} more)`}
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
            <CuratedModelCard
              key={model.ollamaId}
              model={model}
              isInstalled={installedIds.has(model.ollamaId)}
              isDownloading={!!downloadProgress[model.ollamaId]}
              progress={downloadProgress[model.ollamaId]}
              onDownload={onDownload}
            />
          ))}
        </div>

        {catalogModels.length === 0 && (
          <div className="py-8 text-center text-[13px] text-white/28">
            {query ? 'No models match your search' : 'No models in this category'}
          </div>
        )}
      </div>
    </div>
  )
}
