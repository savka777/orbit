import { execFile } from 'child_process'
import { app } from 'electron'
import path from 'path'

function getLLMFitPath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return process.env.LLMFIT_PATH || 'llmfit'
  }
  return path.join(process.resourcesPath, 'bin', 'llmfit')
}

function runLLMFit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(getLLMFitPath(), args, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

function parseSystemOutput(output: string) {
  const lines = output.split('\n')
  const system: Record<string, unknown> = {
    cpu_name: '',
    cpu_cores: 0,
    total_ram_gb: 0,
    available_ram_gb: 0,
    has_gpu: false,
    gpu_name: null,
    gpu_vram_gb: null,
    gpu_count: 0,
    unified_memory: false,
    backend: '',
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('CPU:')) {
      const cpuStr = trimmed.slice(4).trim()
      system.cpu_name = cpuStr
      const coreMatch = cpuStr.match(/\((\d+)\s*cores?\)/)
      if (coreMatch) system.cpu_cores = parseInt(coreMatch[1], 10)
    } else if (trimmed.startsWith('Total RAM:')) {
      const ramMatch = trimmed.match(/([\d.]+)\s*GB/)
      if (ramMatch) system.total_ram_gb = parseFloat(ramMatch[1])
    } else if (trimmed.startsWith('Available RAM:')) {
      const ramMatch = trimmed.match(/([\d.]+)\s*GB/)
      if (ramMatch) system.available_ram_gb = parseFloat(ramMatch[1])
    } else if (trimmed.startsWith('Backend:')) {
      system.backend = trimmed.slice(8).trim()
    } else if (trimmed.startsWith('GPU:')) {
      system.has_gpu = true
      system.gpu_count = 1
      const gpuStr = trimmed.slice(4).trim()
      system.gpu_name = gpuStr.split('(')[0].trim()
      if (gpuStr.includes('unified memory')) system.unified_memory = true
      const vramMatch = gpuStr.match(/([\d.]+)\s*GB\s*shared/)
      if (vramMatch) system.gpu_vram_gb = parseFloat(vramMatch[1])
    }
  }

  return system
}

function parseFitOutput(output: string) {
  const system = parseSystemOutput(output)
  const models: Record<string, unknown>[] = []

  const lines = output.split('\n')
  for (const line of lines) {
    // Table rows start with │ and contain model data
    if (!line.includes('│') || line.includes('──') || line.includes('Status')) continue

    const cells = line.split('│').map(c => c.trim()).filter(Boolean)
    if (cells.length < 10) continue

    const statusRaw = cells[0]
    let fit_level = 'marginal'
    if (statusRaw.includes('Perfect')) fit_level = 'perfect'
    else if (statusRaw.includes('Good')) fit_level = 'good'
    else if (statusRaw.includes('Marginal')) fit_level = 'marginal'
    else if (statusRaw.includes('Too Tight') || statusRaw.includes('tight')) fit_level = 'too_tight'

    const name = cells[1]
    const provider = cells[2]
    const sizeStr = cells[3]
    const score = parseInt(cells[4], 10) || 0
    const tps = parseFloat(cells[5]) || 0
    const quant = cells[6]
    const runtime = cells[7]
    const mode = cells[8]
    const memPctStr = cells[9]
    const contextStr = cells.length > 10 ? cells[10] : '4k'

    const paramMatch = sizeStr.match(/([\d.]+)B/)
    const paramCount = paramMatch ? parseFloat(paramMatch[1]) * 1e9 : 0

    const memPct = parseFloat(memPctStr) || 0
    const memRequired = (system.total_ram_gb as number) * (memPct / 100)

    const ctxMatch = contextStr.match(/([\d.]+)k/)
    const contextLength = ctxMatch ? parseFloat(ctxMatch[1]) * 1024 : 4096

    models.push({
      name,
      provider,
      parameter_count: paramCount,
      fit_level,
      run_mode: mode.toLowerCase(),
      score,
      score_components: { quality: score / 100, speed: tps / 100, fit: (100 - memPct) / 100, context: 0.5 },
      estimated_tps: tps,
      best_quant: quant,
      memory_required_gb: parseFloat(memRequired.toFixed(1)),
      memory_available_gb: system.available_ram_gb,
      utilization_pct: memPct,
      context_length: contextLength,
      gguf_sources: [],
    })
  }

  return { system, models }
}

export async function scanHardware(): Promise<unknown> {
  const output = await runLLMFit(['system'])
  return { system: parseSystemOutput(output) }
}

export async function recommendModels(): Promise<unknown> {
  const output = await runLLMFit(['fit'])
  return parseFitOutput(output)
}

// No-op — CLI tool doesn't need lifecycle management
export function stopLLMFit(): void {}
