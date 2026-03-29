import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOllama } from '../useOllama'
import type { OllamaModel } from '../../types/ollama'

const makeOllamaModel = (name: string): OllamaModel => ({
  name, model: name, size: 4_100_000_000, digest: 'abc', modified_at: '2026-01-01T00:00:00Z',
  details: { parent_model: '', format: 'gguf', family: 'llama', parameter_size: '7B', quantization_level: 'Q4_0' },
})

describe('useOllama', () => {
  let capturedProgressCb: ((data: unknown) => void) | null = null

  beforeEach(() => {
    capturedProgressCb = null
    window.orbit.checkOllamaStatus = vi.fn().mockResolvedValue('running')
    window.orbit.listOllamaModels = vi.fn().mockResolvedValue({ models: [makeOllamaModel('llama3.2:latest')] })
    window.orbit.pullModel = vi.fn().mockResolvedValue(undefined)
    window.orbit.deleteModel = vi.fn().mockResolvedValue(undefined)
    window.orbit.startOllama = vi.fn().mockResolvedValue(true)
    window.orbit.onPullProgress = vi.fn((cb) => { capturedProgressCb = cb; return vi.fn() })
  })

  it('fetches status and models on mount', async () => {
    const { result } = renderHook(() => useOllama())
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    expect(window.orbit.checkOllamaStatus).toHaveBeenCalled()
    expect(window.orbit.listOllamaModels).toHaveBeenCalled()
    expect(result.current.status).toBe('running')
    expect(result.current.models).toHaveLength(1)
    expect(result.current.models[0].name).toBe('llama3.2:latest')
  })

  it('auto-starts Ollama when installed-not-running and fetches models on success', async () => {
    window.orbit.checkOllamaStatus = vi.fn().mockResolvedValue('installed-not-running')
    window.orbit.startOllama = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() => useOllama())
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    expect(window.orbit.startOllama).toHaveBeenCalled()
    expect(window.orbit.listOllamaModels).toHaveBeenCalled()
    expect(result.current.status).toBe('running')
    expect(result.current.models).toHaveLength(1)
  })

  it('does not fetch models if auto-start fails', async () => {
    window.orbit.checkOllamaStatus = vi.fn().mockResolvedValue('installed-not-running')
    window.orbit.startOllama = vi.fn().mockResolvedValue(false)
    const { result } = renderHook(() => useOllama())
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    expect(window.orbit.startOllama).toHaveBeenCalled()
    expect(window.orbit.listOllamaModels).not.toHaveBeenCalled()
    expect(result.current.models).toHaveLength(0)
  })

  it('tracks pull progress', async () => {
    const { result } = renderHook(() => useOllama())
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    act(() => { result.current.pullModel('mistral:latest') })
    expect(window.orbit.pullModel).toHaveBeenCalledWith('mistral:latest')
    act(() => { capturedProgressCb?.({ modelName: 'mistral:latest', progress: { status: 'downloading', total: 1000, completed: 500 } }) })
    expect(result.current.downloadProgress['mistral:latest']).toBe(50)
  })

  it('clears progress on success status', async () => {
    const { result } = renderHook(() => useOllama())
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    act(() => { result.current.pullModel('mistral:latest') })
    act(() => { capturedProgressCb?.({ modelName: 'mistral:latest', progress: { status: 'downloading', total: 100, completed: 50 } }) })
    expect(result.current.downloadProgress['mistral:latest']).toBe(50)
    act(() => { capturedProgressCb?.({ modelName: 'mistral:latest', progress: { status: 'success' } }) })
    expect(result.current.downloadProgress['mistral:latest']).toBeUndefined()
  })

  it('sets error on status check failure', async () => {
    window.orbit.checkOllamaStatus = vi.fn().mockRejectedValue(new Error('ipc failed'))
    const { result } = renderHook(() => useOllama())
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    expect(result.current.error?.message).toBe('ipc failed')
  })

  it('progress events for model A do not affect model B', async () => {
    const { result } = renderHook(() => useOllama())
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    act(() => { result.current.pullModel('modelA'); result.current.pullModel('modelB') })
    act(() => { capturedProgressCb?.({ modelName: 'modelA', progress: { status: 'downloading', total: 100, completed: 75 } }) })
    expect(result.current.downloadProgress['modelA']).toBe(75)
    expect(result.current.downloadProgress['modelB']).toBeUndefined()
  })

  it('deleteModel calls window.orbit.deleteModel and refreshes', async () => {
    const { result } = renderHook(() => useOllama())
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    // listOllamaModels was called once during init
    expect(window.orbit.listOllamaModels).toHaveBeenCalledTimes(1)

    await act(async () => { await result.current.deleteModel('llama3.2:latest') })
    expect(window.orbit.deleteModel).toHaveBeenCalledWith('llama3.2:latest')
    // listOllamaModels called again to refresh
    expect(window.orbit.listOllamaModels).toHaveBeenCalledTimes(2)
  })
})
