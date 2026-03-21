import { describe, it, expect } from 'vitest'
import { mapOllamaModel, formatBytes } from '../modelAdapter'
import type { OllamaModel } from '../../types/ollama'
import type { ScoredModel } from '../../types/llmfit'

const makeOllamaModel = (overrides?: Partial<OllamaModel>): OllamaModel => ({
  name: 'llama3.2:latest',
  model: 'llama3.2:latest',
  size: 4_100_000_000,
  digest: 'abc123',
  modified_at: '2026-03-20T00:00:00Z',
  details: {
    parent_model: '',
    format: 'gguf',
    family: 'llama',
    parameter_size: '7B',
    quantization_level: 'Q4_0',
  },
  ...overrides,
})

const makeScoredModel = (overrides?: Partial<ScoredModel>): ScoredModel => ({
  name: 'llama3.2',
  provider: 'meta',
  parameter_count: 7_000_000_000,
  fit_level: 'perfect',
  run_mode: 'gpu',
  score: 0.95,
  score_components: { quality: 0.9, speed: 0.9, fit: 1.0, context: 0.9 },
  estimated_tps: 45,
  best_quant: 'Q4_0',
  memory_required_gb: 4.1,
  memory_available_gb: 16,
  utilization_pct: 25,
  context_length: 8192,
  gguf_sources: [],
  ...overrides,
})

describe('formatBytes', () => {
  it('formats bytes to GB', () => {
    expect(formatBytes(4_100_000_000)).toBe('4.1 GB')
  })
  it('formats bytes to MB', () => {
    expect(formatBytes(500_000_000)).toBe('500 MB')
  })
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })
  it('formats bytes to TB', () => {
    expect(formatBytes(1_500_000_000_000)).toBe('1.5 TB')
  })
})

describe('mapOllamaModel', () => {
  it('maps basic fields correctly', () => {
    const raw = makeOllamaModel()
    const result = mapOllamaModel(raw)
    expect(result.id).toBe('llama3.2:latest')
    expect(result.name).toBe('llama3.2')
    expect(result.size).toBe('4.1 GB')
    expect(result.parameterCount).toBe('7B')
    expect(result.downloaded).toBe(true)
    expect(result.featured).toBe(false)
  })
  it('extracts display name before colon tag', () => {
    const raw = makeOllamaModel({ name: 'mistral:7b-instruct-v0.3' })
    const result = mapOllamaModel(raw)
    expect(result.name).toBe('mistral')
  })
  it('handles name without tag', () => {
    const raw = makeOllamaModel({ name: 'phi3' })
    const result = mapOllamaModel(raw)
    expect(result.name).toBe('phi3')
  })
  it('derives category from family', () => {
    const raw = makeOllamaModel()
    raw.details.family = 'llama'
    const result = mapOllamaModel(raw)
    expect(result.categories).toContain('chat')
  })
  it('maps codestral family to code category', () => {
    const raw = makeOllamaModel()
    raw.details.family = 'codestral'
    const result = mapOllamaModel(raw)
    expect(result.categories).toContain('code')
  })
  it('defaults to unknown compatibility without scored models', () => {
    const raw = makeOllamaModel()
    const result = mapOllamaModel(raw)
    expect(result.compatibility).toBe('unknown')
  })
  it('maps perfect fit_level to full compatibility', () => {
    const raw = makeOllamaModel({ name: 'llama3.2:latest' })
    const scored = [makeScoredModel({ name: 'llama3.2', fit_level: 'perfect' })]
    const result = mapOllamaModel(raw, scored)
    expect(result.compatibility).toBe('full')
  })
  it('maps good fit_level to full compatibility', () => {
    const raw = makeOllamaModel({ name: 'llama3.2:latest' })
    const scored = [makeScoredModel({ name: 'llama3.2', fit_level: 'good' })]
    const result = mapOllamaModel(raw, scored)
    expect(result.compatibility).toBe('full')
  })
  it('maps marginal fit_level to partial compatibility', () => {
    const raw = makeOllamaModel({ name: 'llama3.2:latest' })
    const scored = [makeScoredModel({ name: 'llama3.2', fit_level: 'marginal' })]
    const result = mapOllamaModel(raw, scored)
    expect(result.compatibility).toBe('partial')
  })
  it('maps too_tight fit_level to incompatible', () => {
    const raw = makeOllamaModel({ name: 'llama3.2:latest' })
    const scored = [makeScoredModel({ name: 'llama3.2', fit_level: 'too_tight' })]
    const result = mapOllamaModel(raw, scored)
    expect(result.compatibility).toBe('incompatible')
  })
  it('derives description from family and parameter size', () => {
    const raw = makeOllamaModel()
    const result = mapOllamaModel(raw)
    expect(result.description).toContain('llama')
    expect(result.description).toContain('7B')
  })
})
