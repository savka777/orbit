import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Cpu, MemoryStick, Monitor, HardDrive, Check, AlertTriangle } from 'lucide-react'
import { hardwareSpecs, models } from '../data/mock'
import OrbitPulse from '../components/OrbitPulse'

type HardwareAuditProps = {
  onNavigateToModels?: () => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Cpu,
  MemoryStick,
  Monitor,
  HardDrive,
}

const iconColorMap: Record<string, string> = {
  Cpu: 'border border-white/8 bg-white/4 text-white/78',
  MemoryStick: 'border border-white/8 bg-white/4 text-white/78',
  Monitor: 'border border-white/8 bg-white/4 text-white/78',
  HardDrive: 'border border-white/8 bg-white/4 text-white/78',
}

const statusDotColor: Record<string, string> = {
  good: 'bg-[#7d92ff]',
  warning: 'bg-[#f3ae59]',
  low: 'bg-[#ff7b7b]',
}

const compatibilityConfig = {
  full: {
    label: 'Full Speed',
    classes: 'bg-white text-stone-900',
  },
  partial: {
    label: 'Reduced Speed',
    classes: 'bg-white/7 text-white/68',
  },
  incompatible: {
    label: 'Incompatible',
    classes: 'bg-white/5 text-white/34',
  },
}

export default function HardwareAudit({ onNavigateToModels }: HardwareAuditProps) {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'results'>('idle')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (scanState !== 'scanning') return

    setProgress(0)
    const duration = 3000
    const interval = 30
    const steps = duration / interval
    let current = 0

    const timer = setInterval(() => {
      current++
      setProgress(Math.min(Math.round((current / steps) * 100), 100))
      if (current >= steps) {
        clearInterval(timer)
        setScanState('results')
      }
    }, interval)

    return () => clearInterval(timer)
  }, [scanState])

  const fullSpeedCount = models.filter((m) => m.compatibility === 'full').length

  return (
    <div className="h-full min-h-0 overflow-y-auto px-6 pt-2 pb-6">
      <AnimatePresence mode="wait">
        {scanState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col items-center justify-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/8 bg-white/4">
              <Cpu className="h-7 w-7 text-white/82" strokeWidth={1.5} />
            </div>
            <h1 className="mb-1 text-[14px] font-semibold text-stone-50">Scan Your Hardware</h1>
            <p className="mb-6 text-[12px] text-white/38">
              Detect your system specs and find compatible models
            </p>
            <button
              onClick={() => setScanState('scanning')}
              className="cursor-pointer rounded-full bg-white px-5 py-2 text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-[0.98]"
            >
              Start Scan
            </button>
          </motion.div>
        )}

        {scanState === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col items-center justify-center"
          >
            <div className="mb-4">
              <OrbitPulse size={40} label="" />
            </div>
            <p className="mb-1 text-[13px] text-white/38">Scanning hardware...</p>
            <p className="text-[14px] font-mono font-medium text-white/58">
              {progress}%
            </p>
          </motion.div>
        )}

        {scanState === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-[960px]"
          >
            <div className="mb-4 flex items-center gap-2">
              <h1 className="text-[14px] font-semibold text-stone-50">System Profile</h1>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/8">
                <Check className="h-3 w-3 text-white" />
              </span>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {hardwareSpecs.map((spec) => {
                const Icon = iconMap[spec.icon]
                return (
                  <div
                    key={spec.label}
                    className="app-card rounded-[22px] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconColorMap[spec.icon]}`}
                        >
                          {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-white/28">
                            {spec.label}
                          </p>
                          <p className="mt-0.5 font-mono text-[13px] font-medium text-stone-50">
                            {spec.value}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full ${statusDotColor[spec.status]}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div>
              <h2 className="mb-3 text-[14px] font-semibold text-stone-50">Model Compatibility</h2>
              <div className="space-y-1">
                {models.map((model) => {
                  const compat = compatibilityConfig[model.compatibility]
                  return (
                    <div
                      key={model.id}
                      className="app-card app-card-hover flex items-center justify-between rounded-[18px] px-3.5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13px] font-medium text-stone-50">{model.name}</span>
                        <span className="text-[12px] text-white/32">{model.parameterCount}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-white/40">{model.size}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${compat.classes}`}
                        >
                          {compat.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] text-white/42">
                <AlertTriangle className="h-3.5 w-3.5 text-[#7d92ff]" strokeWidth={1.5} />
                <span>
                  Your system can run{' '}
                  <span className="font-medium text-stone-50">{fullSpeedCount} models</span>{' '}
                  at full speed
                </span>
              </div>
              <button
                onClick={onNavigateToModels}
                className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-stone-900 transition-colors hover:bg-stone-100 active:scale-[0.98]"
              >
                Browse Model Library
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
