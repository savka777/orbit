import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChat } from '../useChat'
import type { OllamaChatMessage } from '../../types/ollama'

describe('useChat', () => {
  let capturedChunkCb: ((data: unknown) => void) | null = null
  let capturedDoneCb: ((data: unknown) => void) | null = null
  const mockCleanupChunk = vi.fn()
  const mockCleanupDone = vi.fn()

  beforeEach(() => {
    capturedChunkCb = null
    capturedDoneCb = null
    window.orbit.onChatChunk = vi.fn((cb) => { capturedChunkCb = cb; return mockCleanupChunk })
    window.orbit.onChatDone = vi.fn((cb) => { capturedDoneCb = cb; return mockCleanupDone })
    window.orbit.chat = vi.fn().mockResolvedValue(undefined)
  })

  const defaultOptions = { model: 'llama3.2', conversationId: 'conv-1', onStreamComplete: vi.fn() }

  it('starts with initial state', () => {
    const { result } = renderHook(() => useChat(defaultOptions))
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamedContent).toBe('')
    expect(result.current.error).toBeNull()
  })

  it('calls window.orbit.chat with correct args', async () => {
    const { result } = renderHook(() => useChat(defaultOptions))
    const history: OllamaChatMessage[] = [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }]
    await act(async () => { result.current.sendMessage('how are you?', history) })
    expect(window.orbit.chat).toHaveBeenCalledWith('llama3.2', [...history, { role: 'user', content: 'how are you?' }], 'conv-1')
    expect(result.current.isStreaming).toBe(true)
  })

  it('accumulates streamed content', async () => {
    const { result } = renderHook(() => useChat(defaultOptions))
    await act(async () => { result.current.sendMessage('test', []) })
    act(() => { capturedChunkCb?.({ conversationId: 'conv-1', chunk: { message: { content: 'Hello' }, done: false } }) })
    expect(result.current.streamedContent).toBe('Hello')
    act(() => { capturedChunkCb?.({ conversationId: 'conv-1', chunk: { message: { content: ' world' }, done: false } }) })
    expect(result.current.streamedContent).toBe('Hello world')
  })

  it('calls onStreamComplete and resets on done', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useChat({ ...defaultOptions, onStreamComplete: onComplete }))
    await act(async () => { result.current.sendMessage('test', []) })
    act(() => { capturedChunkCb?.({ conversationId: 'conv-1', chunk: { message: { content: 'done' }, done: false } }) })
    act(() => { capturedDoneCb?.({ conversationId: 'conv-1' }) })
    expect(onComplete).toHaveBeenCalledWith('done')
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamedContent).toBe('')
  })

  it('ignores chunks for other conversations', async () => {
    const { result } = renderHook(() => useChat(defaultOptions))
    await act(async () => { result.current.sendMessage('test', []) })
    act(() => { capturedChunkCb?.({ conversationId: 'other', chunk: { message: { content: 'wrong' }, done: false } }) })
    expect(result.current.streamedContent).toBe('')
  })

  it('ignores sendMessage while streaming', async () => {
    const { result } = renderHook(() => useChat(defaultOptions))
    await act(async () => { result.current.sendMessage('first', []) })
    await act(async () => { result.current.sendMessage('second', []) })
    expect(window.orbit.chat).toHaveBeenCalledTimes(1)
  })

  it('sets error when chat rejects', async () => {
    window.orbit.chat = vi.fn().mockRejectedValue(new Error('connection refused'))
    const { result } = renderHook(() => useChat(defaultOptions))
    await act(async () => { result.current.sendMessage('test', []) })
    expect(result.current.error?.message).toBe('connection refused')
    expect(result.current.isStreaming).toBe(false)
  })

  it('clears error on retry', async () => {
    window.orbit.chat = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useChat(defaultOptions))
    await act(async () => { result.current.sendMessage('test', []) })
    expect(result.current.error).not.toBeNull()
    await act(async () => { result.current.sendMessage('retry', []) })
    expect(result.current.error).toBeNull()
  })

  it('ignores stale chunks after conversationId change', async () => {
    const { result, rerender } = renderHook(
      ({ convId }) => useChat({ model: 'llama3.2', conversationId: convId, onStreamComplete: vi.fn() }),
      { initialProps: { convId: 'conv-1' } }
    )
    await act(async () => { result.current.sendMessage('test', []) })
    rerender({ convId: 'conv-2' })
    act(() => { capturedChunkCb?.({ conversationId: 'conv-1', chunk: { message: { content: 'stale' }, done: false } }) })
    expect(result.current.streamedContent).toBe('')
  })

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderHook(() => useChat(defaultOptions))
    unmount()
    expect(mockCleanupChunk).toHaveBeenCalled()
    expect(mockCleanupDone).toHaveBeenCalled()
  })
})
