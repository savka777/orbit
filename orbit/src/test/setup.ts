import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

export function createMockOrbit(): typeof window.orbit {
  return {
    platform: 'darwin',
    checkOllamaStatus: vi.fn().mockResolvedValue('running' as const),
    listOllamaModels: vi.fn().mockResolvedValue({ models: [] }),
    startOllama: vi.fn().mockResolvedValue(true),
    pullModel: vi.fn().mockResolvedValue(undefined),
    chat: vi.fn().mockResolvedValue(undefined),
    scanHardware: vi.fn().mockResolvedValue({ system: {} }),
    recommendModels: vi.fn().mockResolvedValue({ system: {}, models: [] }),
    onPullProgress: vi.fn().mockReturnValue(() => {}),
    onChatChunk: vi.fn().mockReturnValue(() => {}),
    onChatDone: vi.fn().mockReturnValue(() => {}),
  }
}

beforeEach(() => {
  (window as unknown as Record<string, unknown>).orbit = createMockOrbit()
})
