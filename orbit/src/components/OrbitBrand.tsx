import OrbitMark from './OrbitMark'

type OrbitBrandProps = {
  compact?: boolean
}

export default function OrbitBrand({ compact = false }: OrbitBrandProps) {
  if (compact) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-white/88">
        <OrbitMark className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-white/88">
        <OrbitMark className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <div className="text-[18px] font-semibold tracking-[-0.02em] text-stone-50">
          Orbit
        </div>
        <div className="text-[11px] text-white/42">
          AI, Free for All.
        </div>
      </div>
    </div>
  )
}
