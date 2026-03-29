import { describe, it, expect } from 'vitest'
import { normalizeModelKey, mergeModels, buildPullName, sortModels } from '../modelAdapter'
import type { ScoredModel } from '../../types/llmfit'
import type { OllamaModel } from '../../types/ollama'

describe('normalizeModelKey', () => {
  it('normalizes Ollama tag to family+size', () => {
    expect(normalizeModelKey('llama3.3:70b-instruct-q4_K_M')).toBe('llama33:70b')
  })

  it('normalizes LLMFit display name to family+size', () => {
    expect(normalizeModelKey('Llama 3.3 70B')).toBe('llama33:70b')
  })

  it('matches Ollama and LLMFit names for same model', () => {
    expect(normalizeModelKey('llama3.3:70b-instruct-q4_K_M'))
      .toBe(normalizeModelKey('Llama 3.3 70B'))
  })

  it('does not false-match different versions', () => {
    expect(normalizeModelKey('llama2:7b')).not.toBe(normalizeModelKey('llama3:7b'))
  })

  it('handles models without size token', () => {
    expect(normalizeModelKey('phi-3-mini')).toBe('phi3mini')
  })

  it('strips quantization suffixes', () => {
    expect(normalizeModelKey('llama3.3:7b-q4_K_M')).toBe(normalizeModelKey('llama3.3:7b-q8_0'))
  })
})

describe('buildPullName', () => {
  it('maps known HuggingFace names to Ollama tags', () => {
    expect(buildPullName('meta-llama/Llama-3.2-3B', '3B', 'Q4_K_M')).toBe('llama3.2:3b')
  })

  it('maps known model with org prefix', () => {
    expect(buildPullName('Qwen/Qwen2.5-3B-Instruct', '3B', 'Q4_K_M')).toBe('qwen2.5:3b')
  })

  it('falls back to stripping org and extracting size', () => {
    expect(buildPullName('someorg/cool-model-7B', '7B', 'Q4_K_M')).toBe('cool-model:7b')
  })

  it('handles names without org prefix', () => {
    expect(buildPullName('mistral-7b-instruct', '7B', 'Q4_K_M')).toBe('mistral:7b')
  })
})

describe('mergeModels', () => {
  const ollamaModel: OllamaModel = {
    name: 'llama3.3:70b-instruct-q4_K_M',
    model: 'llama3.3:70b-instruct-q4_K_M',
    size: 40_000_000_000,
    digest: 'abc123',
    modified_at: '2026-01-01',
    details: {
      parent_model: '', format: 'gguf', family: 'llama',
      parameter_size: '70B', quantization_level: 'Q4_K_M',
    },
  }

  const scoredModel: ScoredModel = {
    name: 'Llama 3.3',
    provider: 'Meta',
    parameter_count: 70e9,
    fit_level: 'good',
    run_mode: 'gpu',
    score: 85,
    score_components: { quality: 0.9, speed: 0.8, fit: 0.85, context: 0.5 },
    estimated_tps: 42,
    best_quant: 'Q4_K_M',
    memory_required_gb: 38,
    memory_available_gb: 48,
    utilization_pct: 79,
    context_length: 8192,
    gguf_sources: [],
  }

  it('merges matching Ollama + LLMFit models', () => {
    const result = mergeModels([ollamaModel], [scoredModel])
    expect(result).toHaveLength(1)
    expect(result[0].downloaded).toBe(true)
    expect(result[0].score).toBe(85)
    expect(result[0].fitLevel).toBe('good')
  })

  it('includes unmatched Ollama models as downloaded/unknown', () => {
    const niche: OllamaModel = { ...ollamaModel, name: 'custom-model:latest', details: { ...ollamaModel.details, family: 'custom' } }
    const result = mergeModels([niche], [])
    expect(result).toHaveLength(1)
    expect(result[0].downloaded).toBe(true)
    expect(result[0].fitLevel).toBe('unknown')
  })

  it('includes unmatched LLMFit models as not-downloaded', () => {
    const result = mergeModels([], [scoredModel])
    expect(result).toHaveLength(1)
    expect(result[0].downloaded).toBe(false)
    expect(result[0].score).toBe(85)
  })
})

describe('sortModels', () => {
  it('puts installed models first', () => {
    const models = [
      { downloaded: false, score: 90, fitLevel: 'good' as const },
      { downloaded: true, score: 50, fitLevel: 'marginal' as const },
    ] as any[]
    const sorted = sortModels(models)
    expect(sorted[0].downloaded).toBe(true)
  })

  it('sorts by score within groups', () => {
    const models = [
      { downloaded: false, score: 50, fitLevel: 'marginal' as const },
      { downloaded: false, score: 90, fitLevel: 'good' as const },
    ] as any[]
    const sorted = sortModels(models)
    expect(sorted[0].score).toBe(90)
  })

  it('puts too_tight at bottom of each group', () => {
    const models = [
      { downloaded: false, score: 90, fitLevel: 'too_tight' as const },
      { downloaded: false, score: 50, fitLevel: 'good' as const },
    ] as any[]
    const sorted = sortModels(models)
    expect(sorted[0].score).toBe(50)
  })
})
