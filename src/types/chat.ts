export type Role = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  thinkingContent?: string
  timestamp: number
  model?: string
  tokensPerSec?: number
  durationMs?: number
  isError?: boolean
  fileAttachments?: FileAttachment[]
}

export interface FileAttachment {
  name: string
  size: number
  content: string
  type: string
  kind: 'image' | 'text'
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  model: string
  systemPrompt?: string
}

export interface ModelDetails {
  parent_model?: string
  format?: string
  family?: string
  families?: string[]
  parameter_size?: string
  quantization_level?: string
  context_length?: number
  embedding_length?: number
}

export interface LocalModel {
  name: string
  model: string
  modified_at?: string
  size: number
  digest: string
  details?: ModelDetails
  capabilities?: string[]
}

export interface ChatSettings {
  systemPrompt: string
  temperature: number
  topP: number
  maxTokens: number
  contextWindow: number
  theme: 'dark' | 'light' | 'system'
  ollamaHost: string
  tailscaleMachine: string
  tailscaleTailnet: string
  autoScroll: boolean
  enableThinking: boolean
}
