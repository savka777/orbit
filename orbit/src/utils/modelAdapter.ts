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

const CODE_FAMILIES = new Set(['codestral', 'starcoder', 'deepseek-coder', 'codegemma', 'codellama'])

function deriveCategories(family: string): string[] {
  const lower = family.toLowerCase()
  if (CODE_FAMILIES.has(lower)) return ['code']
  return ['chat']
}

function mapFitLevel(fitLevel: ScoredModel['fit_level']): Model['compatibility'] {
  switch (fitLevel) {
    case 'perfect':
    case 'good':
      return 'full'
    case 'marginal':
      return 'partial'
    case 'too_tight':
      return 'incompatible'
  }
}

export function mapOllamaModel(raw: OllamaModel, scoredModels?: ScoredModel[]): Model {
  const displayName = raw.name.includes(':') ? raw.name.split(':')[0] : raw.name
  const family = raw.details?.family ?? 'unknown'
  const parameterSize = raw.details?.parameter_size ?? ''

  const scored = scoredModels?.find(
    (s) => displayName.toLowerCase().includes(s.name.toLowerCase()) ||
           s.name.toLowerCase().includes(displayName.toLowerCase())
  )

  return {
    id: raw.name,
    name: displayName,
    size: formatBytes(raw.size),
    parameterCount: parameterSize,
    categories: deriveCategories(family),
    description: `${family} model, ${parameterSize} parameters`,
    downloaded: true,
    featured: false,
    compatibility: scored ? mapFitLevel(scored.fit_level) : 'unknown',
  }
}
