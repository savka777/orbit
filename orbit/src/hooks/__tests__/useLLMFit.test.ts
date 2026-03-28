import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLLMFit } from '../useLLMFit'
import type { SystemProfile, ScoredModel } from '../../types/llmfit'

const mockSystemProfile: SystemProfile = {
  total_ram_gb: 16, available_ram_gb: 10, cpu_cores: 12, cpu_name: 'Apple M2 Pro',
  has_gpu: true, gpu_vram_gb: null, gpu_name: 'M2 Pro GPU', gpu_count: 1,
  unified_memory: true, backend: 'metal',
}

const mockScoredModel: ScoredModel = {
  name: 'llama3.2', provider: 'meta', parameter_count: 7_000_000_000,
  fit_level: 'perfect', run_mode: 'gpu', score: 95,
  score_components: { quality: 0.9, speed: 0.9, fit: 1.0, context: 0.9 },
  estimated_tps: 45, best_quant: 'Q4_0', memory_required_gb: 4.1,
  memory_available_gb: 16, utilization_pct: 25, context_length: 8192, gguf_sources: [],
}

describe('useLLMFit', () => {
  beforeEach(() => {
    window.orbit.scanHardware = vi.fn().mockResolvedValue({ system: mockSystemProfile })
    window.orbit.recommendModels = vi.fn().mockResolvedValue({ system: mockSystemProfile, models: [mockScoredModel] })
  })

  it('starts with null systemProfile and empty scoredModels', () => {
    const { result } = renderHook(() => useLLMFit())
    expect(result.current.systemProfile).toBeNull()
    expect(result.current.scoredModels).toEqual([])
    expect(result.current.isScanning).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('scan() fetches system profile', async () => {
    const { result } = renderHook(() => useLLMFit())
    await act(async () => { await result.current.scan() })
    expect(window.orbit.scanHardware).toHaveBeenCalled()
    expect(result.current.systemProfile).toEqual(mockSystemProfile)
  })

  it('recommend() fetches scored models and system profile', async () => {
    const { result } = renderHook(() => useLLMFit())
    await act(async () => { await result.current.recommend() })
    expect(window.orbit.recommendModels).toHaveBeenCalled()
    expect(result.current.scoredModels).toHaveLength(1)
    expect(result.current.systemProfile).toEqual(mockSystemProfile)
  })

  it('scanAndRecommend() calls recommend()', async () => {
    const { result } = renderHook(() => useLLMFit())
    await act(async () => { await result.current.scanAndRecommend() })
    expect(window.orbit.recommendModels).toHaveBeenCalled()
    expect(result.current.systemProfile).not.toBeNull()
    expect(result.current.scoredModels).toHaveLength(1)
  })

  it('sets isScanning during async calls', async () => {
    let resolvePromise: (v: unknown) => void
    window.orbit.scanHardware = vi.fn().mockReturnValue(new Promise((r) => { resolvePromise = r }))
    const { result } = renderHook(() => useLLMFit())
    let scanPromise: Promise<void>
    act(() => { scanPromise = result.current.scan() })
    expect(result.current.isScanning).toBe(true)
    await act(async () => { resolvePromise!({ system: mockSystemProfile }); await scanPromise! })
    expect(result.current.isScanning).toBe(false)
  })

  it('sets error on scan failure', async () => {
    window.orbit.scanHardware = vi.fn().mockRejectedValue(new Error('llmfit not found'))
    const { result } = renderHook(() => useLLMFit())
    await act(async () => { await result.current.scan() })
    expect(result.current.error?.message).toBe('llmfit not found')
    expect(result.current.isScanning).toBe(false)
  })

  it('clears error on retry', async () => {
    window.orbit.scanHardware = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ system: mockSystemProfile })
    const { result } = renderHook(() => useLLMFit())
    await act(async () => { await result.current.scan() })
    expect(result.current.error).not.toBeNull()
    await act(async () => { await result.current.scan() })
    expect(result.current.error).toBeNull()
    expect(result.current.systemProfile).toEqual(mockSystemProfile)
  })
})
