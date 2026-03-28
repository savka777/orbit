export type Model = {
  id: string
  name: string
  parameterCount: string
  size: string
  categories: string[]
  description: string
  downloaded: boolean
  compatibility: 'full' | 'partial' | 'incompatible' | 'unknown'
  score: number
  estimatedTps: number
  memoryRequiredGb: number
  bestQuant: string
  fitLevel: 'perfect' | 'good' | 'marginal' | 'too_tight' | 'unknown'
}

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  timestamp: string
}

export type Conversation = {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  model: string
  messages: Message[]
}

export type MCPTool = {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  configSnippet: string
}

export type HardwareSpec = {
  label: string
  value: string
  icon: string
  status: 'good' | 'warning' | 'low'
}
