import { AnimatePresence, motion } from 'framer-motion'
import { Cpu, MemoryStick, Monitor, Check, AlertTriangle, Download, MessageSquare } from 'lucide-react'
import OrbitPulse from '../components/OrbitPulse'
import type { SystemProfile } from '../types/llmfit'
import type { Model, HardwareSpec } from '../types/models'
import type { OllamaStatus } from '../types/ollama'

type HardwareAuditProps = {
  systemProfile: SystemProfile | null
  models: Model[]
  isScanning: boolean
  scanError: Error | null
  ollamaStatus: OllamaStatus
  downloadProgress: Record<string, number>
  onScan: () => void
  onDownload: (modelName: string) => void
  onNavigateToModels?: () => void
  onNavigateToWelcome?: () => void
}

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

const fitLevelConfig: Record<string, { label: string; classes: string }> = {
  perfect: { label: 'Full Speed', classes: 'bg-white text-stone-900' },
  good: { label: 'Full Speed', classes: 'bg-white text-stone-900' },
  marginal: { label: 'Reduced Speed', classes: 'bg-white/7 text-white/68' },
  too_tight: { label: 'Incompatible', classes: 'bg-white/5 text-white/34' },
  unknown: { label: 'Unknown', classes: 'bg-white/5 text-white/34' },
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

export default function HardwareAudit({
  systemProfile,
  models,
  isScanning,
  scanError,
  ollamaStatus,
  downloadProgress,
  onScan,
  onDownload,
  onNavigateToModels,
  onNavigateToWelcome,
}: HardwareAuditProps) {
  const scanState = isScanning ? 'scanning' : systemProfile ? 'results' : 'idle'
  const specs = systemProfile ? mapSystemToSpecs(systemProfile) : []
  const fullSpeedCount = models.filter(
    (m) => m.fitLevel === 'perfect' || m.fitLevel === 'good'
  ).length
  const hasAnyDownloaded = models.some(m => m.downloaded)

  return (
    <div className="h-full min-h-0 overflow-y-auto px-6 pb-6">
      <AnimatePresence mode="wait">
        {scanState === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex h-full flex-col items-center justify-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/8 bg-white/4">
              <Cpu className="h-7 w-7 text-white/82" strokeWidth={1.5} />
            </div>
            <h1 className="mb-1 text-[14px] font-semibold text-stone-50">Scan Your Hardware</h1>
            <p className="mb-6 text-[12px] text-white/38">Detect your system specs and find compatible models</p>
            {scanError && <p className="mb-4 text-[12px] text-red-400">{scanError.message}</p>}
            <button onClick={onScan} className="cursor-pointer rounded-full bg-white px-5 py-2 text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-[0.98]">Start Scan</button>
          </motion.div>
        )}

        {scanState === 'scanning' && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex h-full flex-col items-center justify-center">
            <div className="mb-4"><OrbitPulse size={40} label="" /></div>
            <p className="mb-1 text-[13px] text-white/38">Scanning hardware...</p>
          </motion.div>
        )}

        {scanState === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="mx-auto max-w-[960px]">
            <div className="mb-4 flex items-center gap-2">
              <h1 className="text-[14px] font-semibold text-stone-50">System Profile</h1>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/8"><Check className="h-3 w-3 text-white" /></span>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
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

            <div>
              <h2 className="mb-3 text-[14px] font-semibold text-stone-50">Model Compatibility</h2>
              <div className="space-y-1">
                {models.map((model) => {
                  const config = fitLevelConfig[model.fitLevel] ?? fitLevelConfig.unknown
                  const progress = downloadProgress[model.id]
                  const isDownloading = progress !== undefined && progress > 0 && progress < 100

                  return (
                    <div key={model.id} className="app-card app-card-hover flex items-center justify-between rounded-[18px] px-3.5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13px] font-medium text-stone-50">{model.name}</span>
                        {model.bestQuant && <span className="text-[12px] text-white/32">{model.bestQuant}</span>}
                        {model.downloaded && (
                          <span className="rounded-full bg-[#5d79ff]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#5d79ff]">Installed</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-white/40">{model.memoryRequiredGb.toFixed(1)} GB</span>
                        <span className="text-[11px] font-mono text-white/32">{model.estimatedTps} tok/s</span>
                        {!model.downloaded && model.fitLevel !== 'too_tight' && ollamaStatus === 'running' ? (
                          isDownloading ? (
                            <span className="text-[11px] font-mono text-white/52">{progress}%</span>
                          ) : (
                            <button
                              onClick={() => onDownload(model.id)}
                              className="flex cursor-pointer items-center gap-1 rounded-full border border-white/8 bg-white/6 px-2.5 py-1 text-[11px] font-medium text-stone-100 transition-colors hover:bg-white/10 active:scale-95"
                            >
                              <Download className="h-3 w-3" strokeWidth={1.5} />
                              Download
                            </button>
                          )
                        ) : !model.downloaded && model.fitLevel !== 'too_tight' && ollamaStatus !== 'running' ? (
                          <a
                            href="https://ollama.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-[#7d92ff] hover:text-white"
                          >
                            Install Ollama
                          </a>
                        ) : (
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${config.classes}`}>{config.label}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] text-white/42">
                <AlertTriangle className="h-3.5 w-3.5 text-[#7d92ff]" strokeWidth={1.5} />
                <span>Your system can run{' '}<span className="font-medium text-stone-50">{fullSpeedCount} models</span>{' '}at full speed</span>
              </div>
              <div className="flex items-center gap-2">
                {hasAnyDownloaded && onNavigateToWelcome && (
                  <button
                    onClick={onNavigateToWelcome}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-4 py-1.5 text-[13px] text-white/58 transition-colors hover:bg-white/7 hover:text-white"
                  >
                    <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Start chatting
                  </button>
                )}
                <button onClick={onNavigateToModels} className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-[0.98]">Browse Model Library</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
