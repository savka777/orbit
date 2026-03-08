export type SystemProfile = {
  total_ram_gb: number
  available_ram_gb: number
  cpu_cores: number
  cpu_name: string
  has_gpu: boolean
  gpu_vram_gb: number | null
  gpu_name: string | null
  gpu_count: number
  unified_memory: boolean
  backend: string
}

export type ScoredModel = {
  name: string
  provider: string
  parameter_count: number
  fit_level: 'perfect' | 'good' | 'marginal' | 'too_tight'
  run_mode: string
  score: number
  score_components: {
    quality: number
    speed: number
    fit: number
    context: number
  }
  estimated_tps: number
  best_quant: string
  memory_required_gb: number
  memory_available_gb: number
  utilization_pct: number
  context_length: number
  gguf_sources: string[]
}

export type LLMFitSystemResponse = {
  system: SystemProfile
}

export type LLMFitFitResponse = {
  system: SystemProfile
  models: ScoredModel[]
}
