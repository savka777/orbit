export type Model = {
  id: string
  name: string
  parameterCount: string
  size: string
  categories: string[]
  description: string
  downloaded: boolean
  featured?: boolean
  compatibility: 'full' | 'partial' | 'incompatible' | 'unknown'
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
