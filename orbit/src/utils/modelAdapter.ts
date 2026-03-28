import type { OllamaModel } from '../types/ollama'
import type { ScoredModel } from '../types/llmfit'
import type { Model } from '../types/models'

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1000))
  const value = bytes / Math.pow(1000, i)
  const formatted = i <= 2 ? Math.round(value) : parseFloat(value.toFixed(1))
  return `${formatted} ${units[i]}`
}

const CODE_FAMILIES = new Set(['codestral', 'starcoder', 'deepseek-coder', 'codegemma', 'codellama', 'deepseek coder'])

function deriveCategories(nameOrFamily: string): string[] {
  const lower = nameOrFamily.toLowerCase()
  for (const fam of CODE_FAMILIES) {
    if (lower.includes(fam)) return ['code']
  }
  return ['chat']
}

export function normalizeModelKey(raw: string): string {
  let base = raw.split(':')[0]
  const afterColon = raw.split(':')[1] || ''
  const sizeMatch = (afterColon || base).match(/(\d+)b/i)
  const size = sizeMatch ? sizeMatch[1].toLowerCase() + 'b' : ''
  base = base.replace(/\s*\d+b\s*/i, '')
  const family = base.toLowerCase().replace(/[\s.\-_]/g, '')
  return size ? `${family}:${size}` : family
}

export function buildPullName(displayName: string, _parameterCount: string, _bestQuant: string): string {
  const parts = displayName.trim().split(/\s+/)
  const result: string[] = []
  for (const part of parts) {
    if (/^\d+(\.\d+)*$/.test(part) && result.length > 0) {
      result[result.length - 1] += part
    } else {
      result.push(part.toLowerCase())
    }
  }
  return result.join('-')
}

function mapFitLevel(fitLevel: ScoredModel['fit_level']): Model['compatibility'] {
  switch (fitLevel) {
    case 'perfect': case 'good': return 'full'
    case 'marginal': return 'partial'
    case 'too_tight': return 'incompatible'
  }
}

function scoredToModel(s: ScoredModel): Model {
  return {
    id: buildPullName(s.name, `${Math.round(s.parameter_count / 1e9)}B`, s.best_quant),
    name: s.name,
    parameterCount: `${Math.round(s.parameter_count / 1e9)}B`,
    size: `${s.memory_required_gb.toFixed(1)} GB`,
    categories: deriveCategories(s.name),
    description: `${s.provider} model, ${Math.round(s.parameter_count / 1e9)}B parameters`,
    downloaded: false,
    compatibility: mapFitLevel(s.fit_level),
    score: s.score,
    estimatedTps: s.estimated_tps,
    memoryRequiredGb: s.memory_required_gb,
    bestQuant: s.best_quant,
    fitLevel: s.fit_level,
  }
}

function ollamaToModel(o: OllamaModel): Model {
  const displayName = o.name.includes(':') ? o.name.split(':')[0] : o.name
  const family = o.details?.family ?? 'unknown'
  const parameterSize = o.details?.parameter_size ?? ''
  return {
    id: o.name,
    name: displayName,
    parameterCount: parameterSize,
    size: formatBytes(o.size),
    categories: deriveCategories(family),
    description: `${family} model, ${parameterSize} parameters`,
    downloaded: true,
    compatibility: 'unknown',
    score: 0,
    estimatedTps: 0,
    memoryRequiredGb: 0,
    bestQuant: o.details?.quantization_level ?? '',
    fitLevel: 'unknown',
  }
}

export function mergeModels(ollamaModels: OllamaModel[], scoredModels: ScoredModel[]): Model[] {
  const results: Model[] = []
  const matchedOllamaNames = new Set<string>()

  for (const scored of scoredModels) {
    const scoredKey = normalizeModelKey(scored.name + ' ' + Math.round(scored.parameter_count / 1e9) + 'B')
    const matchingOllama = ollamaModels.filter(
      (o) => normalizeModelKey(o.name) === scoredKey
    )

    if (matchingOllama.length > 0) {
      for (const o of matchingOllama) {
        matchedOllamaNames.add(o.name)
        const base = ollamaToModel(o)
        results.push({
          ...base,
          compatibility: mapFitLevel(scored.fit_level),
          score: scored.score,
          estimatedTps: scored.estimated_tps,
          memoryRequiredGb: scored.memory_required_gb,
          bestQuant: scored.best_quant,
          fitLevel: scored.fit_level,
        })
      }
    } else {
      results.push(scoredToModel(scored))
    }
  }

  for (const o of ollamaModels) {
    if (!matchedOllamaNames.has(o.name)) {
      results.push(ollamaToModel(o))
    }
  }

  return results
}

export function sortModels(models: Model[]): Model[] {
  return [...models].sort((a, b) => {
    if (a.downloaded !== b.downloaded) return a.downloaded ? -1 : 1
    const aTight = a.fitLevel === 'too_tight' ? 1 : 0
    const bTight = b.fitLevel === 'too_tight' ? 1 : 0
    if (aTight !== bTight) return aTight - bTight
    return b.score - a.score
  })
}
