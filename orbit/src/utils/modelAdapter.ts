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

// Models that are specialized — not ideal as a consumer's first/default model
const SPECIALIST_PATTERNS = [
  'coder', 'code', 'math', 'starcoder', 'codestral', 'deepseek-r1',
  'wizard-math', 'llemma', 'mathstral', 'sqlcoder', 'magicoder',
  'stable-code', 'phind', 'embeddings', 'embed',
]

export function isGeneralPurpose(nameOrFamily: string): boolean {
  const lower = nameOrFamily.toLowerCase()
  return !SPECIALIST_PATTERNS.some(p => lower.includes(p))
}

function deriveCategories(nameOrFamily: string): string[] {
  const lower = nameOrFamily.toLowerCase()
  for (const fam of CODE_FAMILIES) {
    if (lower.includes(fam)) return ['code']
  }
  return ['chat']
}

export function normalizeModelKey(raw: string): string {
  // Strip org prefix (e.g. "meta-llama/Llama-3.2-3B" -> "Llama-3.2-3B")
  let input = raw.includes('/') ? raw.split('/').pop()! : raw
  let base = input.split(':')[0]
  const afterColon = input.split(':')[1] || ''
  const sizeMatch = (afterColon || base).match(/(\d+)b/i)
  const size = sizeMatch ? sizeMatch[1].toLowerCase() + 'b' : ''
  base = base.replace(/\s*\d+b\s*/i, '')
  // Strip common suffixes: instruct, chat, base, awq, etc.
  base = base.replace(/[-_]?(instruct|chat|base|awq|gptq|gguf|it|v\d+.*)$/i, '')
  const family = base.toLowerCase().replace(/[\s.\-_]/g, '')
  return size ? `${family}:${size}` : family
}

// Known mappings from LLMFit HuggingFace-style names to Ollama tags
const OLLAMA_NAME_MAP: Record<string, string> = {
  'meta-llama/llama-3.2-3b': 'llama3.2:3b',
  'meta-llama/llama-3.2-1b': 'llama3.2:1b',
  'meta-llama/llama-3.1-8b-instruct': 'llama3.1:8b',
  'meta-llama/meta-llama-3-8b-instruct': 'llama3:8b',
  'meta-llama/llama-3.3-70b-instruct': 'llama3.3:70b',
  'mistralai/mistral-7b-instruct-v0.3': 'mistral:7b',
  'mistralai/ministral-8b-instruct-2410': 'ministral:8b',
  'microsoft/phi-3-mini-4k-instruct': 'phi3:mini',
  'microsoft/phi-tiny-moe-instruct': 'phi3:mini',
  'google/gemma-2-9b-it': 'gemma2:9b',
  'google/gemma-2-2b-it': 'gemma2:2b',
  'qwen/qwen2.5-3b-instruct': 'qwen2.5:3b',
  'qwen/qwen2.5-7b-instruct': 'qwen2.5:7b',
  'qwen/qwen3-4b-base': 'qwen3:4b',
  'qwen/qwen3-4b-awq': 'qwen3:4b',
  '01-ai/yi-6b-chat': 'yi:6b',
  'deepseek-ai/deepseek-coder-6.7b-instruct': 'deepseek-coder:6.7b',
  'tiiuae/falcon-7b-instruct': 'falcon:7b',
  'openchat/openchat-3.5-0106': 'openchat:7b',
}

export function buildPullName(displayName: string, parameterCount: string, _bestQuant: string): string {
  // Strip org prefix if present (e.g. "meta-llama/Llama-3.2-3B" -> "Llama-3.2-3B")
  const normalized = displayName.toLowerCase().replace(/\s+/g, '-')

  // Check known mapping first
  const mapped = OLLAMA_NAME_MAP[normalized]
  if (mapped) return mapped

  // Fallback: strip org prefix, convert to ollama format
  const withoutOrg = normalized.includes('/') ? normalized.split('/').pop()! : normalized

  // Try to extract model name and size for ollama tag format
  const sizeMatch = withoutOrg.match(/(\d+(?:\.\d+)?)b/i)
  if (sizeMatch) {
    const size = sizeMatch[1].toLowerCase() + 'b'
    // Remove size, instruct, chat suffixes to get base name
    const base = withoutOrg
      .replace(/[-_]?\d+(?:\.\d+)?b.*$/i, '')  // remove size and everything after
      .replace(/[-_]+$/, '')                     // trailing separators
    return `${base}:${size}`
  }

  // Last resort: just use without org
  return withoutOrg
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
