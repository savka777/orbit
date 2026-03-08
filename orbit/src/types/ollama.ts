export type OllamaModel = {
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
}

export type OllamaListResponse = {
  models: OllamaModel[]
}

export type OllamaPullProgress = {
  status: string
  digest?: string
  total?: number
  completed?: number
}

export type OllamaChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type OllamaChatRequest = {
  model: string
  messages: OllamaChatMessage[]
  stream: boolean
}

export type OllamaChatChunk = {
  model: string
  message: OllamaChatMessage
  done: boolean
}

export type OllamaStatus = 'not-installed' | 'installed-not-running' | 'running'

export type UserSegment = 'power-user' | 'partial' | 'brand-new'
