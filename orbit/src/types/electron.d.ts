import type { SystemProfile, ScoredModel } from './llmfit'

export {}

declare global {
  interface Window {
    orbit: {
      platform: string
      checkOllamaStatus: () => Promise<'not-installed' | 'installed-not-running' | 'running'>
      listOllamaModels: () => Promise<{
        models: Array<{
          name: string
          model: string
          size: number
          digest: string
          modified_at: string
          details: {
            parent_model: string
            format: string
            family: string
            parameter_size: string
            quantization_level: string
          }
        }>
      }>
      startOllama: () => Promise<boolean>
      pullModel: (modelName: string) => Promise<void>
      deleteModel: (modelName: string) => Promise<void>
      chat: (
        model: string,
        messages: Array<{ role: string; content: string }>,
        conversationId: string
      ) => Promise<void>
      onPullProgress: (
        callback: (data: {
          modelName: string
          progress: { status: string; total?: number; completed?: number }
        }) => void
      ) => () => void
      onChatChunk: (
        callback: (data: {
          conversationId: string
          chunk: { message: { content: string }; done: boolean }
        }) => void
      ) => () => void
      onChatDone: (
        callback: (data: { conversationId: string }) => void
      ) => () => void
      scanHardware: () => Promise<{ system: SystemProfile }>
      recommendModels: () => Promise<{ system: SystemProfile; models: ScoredModel[] }>
    }
  }
}
